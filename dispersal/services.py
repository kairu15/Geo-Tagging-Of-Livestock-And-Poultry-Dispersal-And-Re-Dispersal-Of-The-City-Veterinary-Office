"""
Core dispersal business logic.

Every function is wrapped in `transaction.atomic()` and uses `select_for_update()`
to prevent concurrent re-dispersal race conditions. Domain exceptions are raised
for invalid state transitions instead of generic errors.

Design principle: the `OwnershipRecord` table is an append-only ledger.
We NEVER overwrite a current_owner without first creating a historical record.
"""
from django.db import transaction
from django.utils import timezone

from livestock.models import Animal
from beneficiaries.models import Beneficiary
from .models import OwnershipRecord, TransferReason


# ---------------------------------------------------------------------------
# Domain exceptions — richer than generic Exception for caller clarity
# ---------------------------------------------------------------------------

class DomainError(Exception):
    """Base domain error."""
    pass


class AnimalAlreadyDispersedError(DomainError):
    """Raised when trying to disperse an animal that is already in someone's custody."""
    pass


class AnimalNotDispersedError(DomainError):
    """Raised when trying to re-disperse an animal that was never dispersed."""
    pass


class NoActiveOwnershipRecordError(DomainError):
    """Raised when an animal has no active ownership record to close."""
    pass


class MultipleActiveOwnershipRecordsError(DomainError):
    """Raised when data integrity is violated — animal has >1 active record."""
    pass


class BeneficiaryNotActiveError(DomainError):
    """Raised when trying to assign an animal to an inactive beneficiary."""
    pass


class BeneficiaryAlreadyHoldsAnimalError(DomainError):
    """Raised when the new beneficiary already holds this animal."""
    pass


class AnimalDeceasedOrCulledError(DomainError):
    """Raised when trying to operate on an animal that is permanently out of the program."""
    pass


class InvalidCoordinatesError(DomainError):
    """Raised when geo-coordinates are outside plausible bounds."""
    pass


# ---------------------------------------------------------------------------
# Philippine geographic bounds (approximate — used for rough validation)
# ---------------------------------------------------------------------------
PH_LAT_MIN = 4.0
PH_LAT_MAX = 22.0
PH_LNG_MIN = 116.0
PH_LNG_MAX = 128.0


def _validate_coordinates(lat, lng):
    """Reject wildly out-of-range GPS coordinates."""
    if lat is not None and lng is not None:
        if not (PH_LAT_MIN <= float(lat) <= PH_LAT_MAX):
            raise InvalidCoordinatesError(
                f"Latitude {lat} is outside Philippine bounds ({PH_LAT_MIN}–{PH_LAT_MAX})."
            )
        if not (PH_LNG_MIN <= float(lng) <= PH_LNG_MAX):
            raise InvalidCoordinatesError(
                f"Longitude {lng} is outside Philippine bounds ({PH_LNG_MIN}–{PH_LNG_MAX})."
            )


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------

def disperse_animal(
    animal: Animal,
    beneficiary: Beneficiary,
    latitude=None,
    longitude=None,
    processed_by=None,
    contract_document=None,
    condition_at_transfer=OwnershipRecord.ConditionAtTransfer.HEALTHY,
    start_date=None,
):
    """
    Initial dispersal — assign an AVAILABLE animal to its first beneficiary.

    This creates the animal's first OwnershipRecord and moves it from
    CVO custody into the field.
    """
    _validate_coordinates(latitude, longitude)

    with transaction.atomic():
        # Lock the animal row to prevent concurrent dispersal
        animal = Animal.objects.select_for_update().get(pk=animal.pk)

        if animal.current_status != Animal.Status.AVAILABLE:
            raise AnimalAlreadyDispersedError(
                f"Animal {animal.tag_id} is '{animal.current_status}', not AVAILABLE."
            )

        if not beneficiary.is_active_beneficiary:
            raise BeneficiaryNotActiveError(
                f"Beneficiary {beneficiary.full_name} is not active."
            )

        record_date = start_date or timezone.now().date()

        # Create the initial custody record
        record = OwnershipRecord.objects.create(
            animal=animal,
            beneficiary=beneficiary,
            transfer_type=OwnershipRecord.TransferType.INITIAL_DISPERSAL,
            status=OwnershipRecord.RecordStatus.ACTIVE,
            start_date=record_date,
            start_latitude=latitude,
            start_longitude=longitude,
            condition_at_transfer=condition_at_transfer,
            processed_by=processed_by,
            contract_document=contract_document,
        )

        # Update denormalized fields on the animal
        animal.current_owner = beneficiary
        animal.current_status = Animal.Status.DISPERSED
        animal.save(update_fields=["current_owner", "current_status", "updated_at"])

    # Sync geo-tag custodianship (outside main transaction for loose coupling)
    try:
        from geotagging.services import sync_custodianship_from_dispersal
        sync_custodianship_from_dispersal(record)
    except Exception:
        pass  # Geo-tagging sync is best-effort; don't block dispersal

    return record


def redisperse_animal(
    animal: Animal,
    new_beneficiary: Beneficiary,
    latitude=None,
    longitude=None,
    end_reason: TransferReason = None,
    processed_by=None,
    condition_at_transfer=OwnershipRecord.ConditionAtTransfer.HEALTHY,
    remarks=None,
    contract_document=None,
    start_date=None,
    offspring_count_returned=0,
):
    """
    Re-disperse an animal to a new beneficiary.

    Closes the current active OwnershipRecord and creates a new one.
    This is the "transfer" operation that maintains the chain of custody.
    """
    _validate_coordinates(latitude, longitude)

    with transaction.atomic():
        animal = Animal.objects.select_for_update().get(pk=animal.pk)

        if animal.current_status not in (
            Animal.Status.DISPERSED,
            Animal.Status.RETURNED_TO_CVO,
        ):
            raise AnimalNotDispersedError(
                f"Animal {animal.tag_id} is '{animal.current_status}' — cannot re-disperse."
            )

        if not new_beneficiary.is_active_beneficiary:
            raise BeneficiaryNotActiveError(
                f"Beneficiary {new_beneficiary.full_name} is not active."
            )

        # Check new beneficiary doesn't already hold this animal
        if animal.current_owner_id == new_beneficiary.pk:
            raise BeneficiaryAlreadyHoldsAnimalError(
                f"Beneficiary {new_beneficiary.full_name} already holds animal {animal.tag_id}."
            )

        # Find and close the current active record
        active_records = list(
            OwnershipRecord.objects.select_for_update().filter(
                animal=animal,
                status=OwnershipRecord.RecordStatus.ACTIVE,
            )
        )

        if len(active_records) == 0:
            raise NoActiveOwnershipRecordError(
                f"Animal {animal.tag_id} has no active ownership record to close."
            )
        elif len(active_records) > 1:
            raise MultipleActiveOwnershipRecordsError(
                f"Data integrity violation: animal {animal.tag_id} has {len(active_records)} active records."
            )

        current_record = active_records[0]
        today = start_date or timezone.now().date()

        # Close the old record
        current_record.end_date = today
        current_record.end_reason = end_reason
        current_record.end_remarks = remarks or ""
        current_record.offspring_count_returned = offspring_count_returned
        current_record.status = OwnershipRecord.RecordStatus.CLOSED
        current_record.save(update_fields=[
            "end_date", "end_reason", "end_remarks",
            "offspring_count_returned", "status",
        ])

        # Create the new custody record
        new_record = OwnershipRecord.objects.create(
            animal=animal,
            beneficiary=new_beneficiary,
            transfer_type=OwnershipRecord.TransferType.RE_DISPERSAL,
            status=OwnershipRecord.RecordStatus.ACTIVE,
            start_date=today,
            start_latitude=latitude,
            start_longitude=longitude,
            condition_at_transfer=condition_at_transfer,
            processed_by=processed_by,
            contract_document=contract_document,
        )

        # Update denormalized fields
        animal.current_owner = new_beneficiary
        animal.current_status = Animal.Status.DISPERSED
        animal.save(update_fields=["current_owner", "current_status", "updated_at"])

    # Sync geo-tag custodianship
    try:
        from geotagging.services import sync_custodianship_from_dispersal
        sync_custodianship_from_dispersal(new_record)
    except Exception:
        pass

    return new_record


def return_animal_to_cvo(
    animal: Animal,
    reason: TransferReason,
    processed_by=None,
    condition=OwnershipRecord.ConditionAtTransfer.HEALTHY,
    remarks=None,
    offspring_count_returned=0,
):
    """
    Return an animal to CVO custody — closes the active record without creating a new one.

    The animal becomes AVAILABLE again (or RETURNED_TO_CVO / DECEASED depending on condition).
    """
    with transaction.atomic():
        animal = Animal.objects.select_for_update().get(pk=animal.pk)

        active_records = list(
            OwnershipRecord.objects.select_for_update().filter(
                animal=animal,
                status=OwnershipRecord.RecordStatus.ACTIVE,
            )
        )

        if len(active_records) == 0:
            raise NoActiveOwnershipRecordError(
                f"Animal {animal.tag_id} has no active ownership record to close."
            )

        current_record = active_records[0]
        today = timezone.now().date()

        # Close the record
        current_record.end_date = today
        current_record.end_reason = reason
        current_record.end_remarks = remarks or ""
        current_record.condition_at_transfer = condition
        current_record.offspring_count_returned = offspring_count_returned
        current_record.status = OwnershipRecord.RecordStatus.CLOSED
        current_record.save(update_fields=[
            "end_date", "end_reason", "end_remarks",
            "condition_at_transfer", "offspring_count_returned", "status",
        ])

        # Determine new status based on condition
        if condition == OwnershipRecord.ConditionAtTransfer.DECEASED:
            new_status = Animal.Status.DECEASED
        else:
            new_status = Animal.Status.RETURNED_TO_CVO

        # Update animal
        animal.current_owner = None
        animal.current_status = new_status
        animal.save(update_fields=["current_owner", "current_status", "updated_at"])

    return current_record


def return_animal_to_cvo_for_redispersal(
    animal: Animal,
    reason: TransferReason,
    processed_by=None,
    condition=OwnershipRecord.ConditionAtTransfer.HEALTHY,
    remarks=None,
    offspring_count_returned=0,
):
    """
    Return animal to CVO temporarily, marking it RETURNED_TO_CVO so it can be
    re-dispersed later. Used when CVO takes back custody before finding a new owner.
    """
    with transaction.atomic():
        animal = Animal.objects.select_for_update().get(pk=animal.pk)

        active_records = list(
            OwnershipRecord.objects.select_for_update().filter(
                animal=animal,
                status=OwnershipRecord.RecordStatus.ACTIVE,
            )
        )

        if len(active_records) == 0:
            raise NoActiveOwnershipRecordError(
                f"Animal {animal.tag_id} has no active ownership record to close."
            )

        current_record = active_records[0]
        today = timezone.now().date()

        current_record.end_date = today
        current_record.end_reason = reason
        current_record.end_remarks = remarks or ""
        current_record.condition_at_transfer = condition
        current_record.offspring_count_returned = offspring_count_returned
        current_record.status = OwnershipRecord.RecordStatus.CLOSED
        current_record.save(update_fields=[
            "end_date", "end_reason", "end_remarks",
            "condition_at_transfer", "offspring_count_returned", "status",
        ])

        if condition == OwnershipRecord.ConditionAtTransfer.DECEASED:
            new_status = Animal.Status.DECEASED
        else:
            new_status = Animal.Status.RETURNED_TO_CVO

        animal.current_owner = None
        animal.current_status = new_status
        animal.save(update_fields=["current_owner", "current_status", "updated_at"])

    return current_record


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_ownership_history(animal: Animal):
    """Return the full ordered chain of custody for an animal."""
    return OwnershipRecord.objects.filter(
        animal=animal
    ).select_related(
        "beneficiary", "end_reason", "processed_by"
    ).order_by("start_date")


def get_beneficiary_current_holdings(beneficiary: Beneficiary):
    """Return all animals currently held by this beneficiary."""
    return Animal.objects.filter(
        current_owner=beneficiary,
        current_status=Animal.Status.DISPERSED,
    ).select_related("species", "breed")


def get_beneficiary_full_history(beneficiary: Beneficiary):
    """Return all ownership records for a beneficiary (current + past)."""
    return OwnershipRecord.objects.filter(
        beneficiary=beneficiary
    ).select_related(
        "animal", "animal__species", "end_reason", "processed_by"
    ).order_by("-start_date")

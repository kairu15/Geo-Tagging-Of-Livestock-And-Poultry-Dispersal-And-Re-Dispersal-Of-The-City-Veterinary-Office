"""
Core geo-tagging business logic.

Every function is wrapped in `transaction.atomic()` and uses `select_for_update()`
to prevent race conditions. Domain exceptions are raised for invalid state transitions.

Design principle: the Custodianship table is an append-only ledger.
We NEVER overwrite an active custodianship without first closing it.
"""
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from livestock.models import Animal
from .models import GeoTag, Caretaker, Custodianship, LocationCheckIn, HandoffReason


# ---------------------------------------------------------------------------
# Domain exceptions
# ---------------------------------------------------------------------------
class GeoDomainError(Exception):
    """Base geo-tagging domain error."""
    pass


class TagAlreadyExistsError(GeoDomainError):
    """Raised when trying to tag an animal that already has an active tag."""
    pass


class NoActiveCustodianshipError(GeoDomainError):
    """Raised when an animal has no active custodianship to close."""
    pass


class MultipleActiveCustodianshipsError(GeoDomainError):
    """Raised when data integrity is violated — tag has >1 active custodianship."""
    pass


class TagRetiredError(GeoDomainError):
    """Raised when trying to operate on a retired tag."""
    pass


class InvalidCoordinatesError(GeoDomainError):
    """Raised when geo-coordinates are outside plausible bounds."""
    pass


# ---------------------------------------------------------------------------
# Philippine geographic bounds (shared with dispersal module)
# ---------------------------------------------------------------------------
PH_LAT_MIN = Decimal("4.0")
PH_LAT_MAX = Decimal("22.0")
PH_LNG_MIN = Decimal("116.0")
PH_LNG_MAX = Decimal("128.0")


def _validate_coordinates(lat, lng):
    """Reject wildly out-of-range GPS coordinates."""
    if lat is not None and lng is not None:
        lat = Decimal(str(lat))
        lng = Decimal(str(lng))
        if not (PH_LAT_MIN <= lat <= PH_LAT_MAX):
            raise InvalidCoordinatesError(
                f"Latitude {lat} is outside Philippine bounds ({PH_LAT_MIN}–{PH_LAT_MAX})."
            )
        if not (PH_LNG_MIN <= lng <= PH_LNG_MAX):
            raise InvalidCoordinatesError(
                f"Longitude {lng} is outside Philippine bounds ({PH_LNG_MIN}–{PH_LNG_MAX})."
            )


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------

def tag_animal(animal, tag_type, tagged_by, initial_caretaker, coordinates, intake_condition="HEALTHY"):
    """
    Create a GeoTag for an animal and open its first Custodianship.

    Args:
        animal: livestock.Animal instance
        tag_type: GeoTag.TagType value
        tagged_by: accounts.User who performed the tagging
        initial_caretaker: geotagging.Caretaker instance
        coordinates: dict with 'latitude' and 'longitude'
        intake_condition: Custodianship.IntakeCondition value
    """
    _validate_coordinates(coordinates.get("latitude"), coordinates.get("longitude"))

    with transaction.atomic():
        # Check if animal already has a geo tag
        if GeoTag.objects.filter(animal=animal, is_active=True).exists():
            raise TagAlreadyExistsError(
                f"Animal {animal.tag_id} already has an active geo tag."
            )

        # Create the GeoTag
        geo_tag = GeoTag.objects.create(
            animal=animal,
            tag_type=tag_type,
            tagged_by=tagged_by,
            is_active=True,
        )

        # Open the first Custodianship
        today = timezone.now().date()
        custodianship = Custodianship.objects.create(
            geo_tag=geo_tag,
            caretaker=initial_caretaker,
            start_date=today,
            start_latitude=coordinates.get("latitude"),
            start_longitude=coordinates.get("longitude"),
            intake_condition=intake_condition,
            status=Custodianship.RecordStatus.ACTIVE,
        )

    return geo_tag, custodianship


# ---------------------------------------------------------------------------
# GPS accuracy threshold for auto-flagging (configurable via settings)
# Default: 50 meters — check-ins with accuracy worse than this are flagged.
# ---------------------------------------------------------------------------
GPS_ACCURACY_THRESHOLD_METERS = 50


def record_location_checkin(custodianship, coordinates, checked_in_by, source,
                            photo=None, notes="",
                            gps_accuracy_meters=None, gps_altitude_meters=None,
                            gps_speed_mps=None):
    """
    Append a LocationCheckIn to an active custodianship.

    Does NOT change custody state — only location tracking within the same caretaker period.
    If gps_accuracy_meters exceeds the configured threshold, the check-in is
    automatically flagged for review.
    """
    _validate_coordinates(coordinates.get("latitude"), coordinates.get("longitude"))

    with transaction.atomic():
        cust = Custodianship.objects.select_for_update().get(pk=custodianship.pk)

        if cust.status != Custodianship.RecordStatus.ACTIVE:
            raise NoActiveCustodianshipError(
                f"Custodianship #{cust.id} is {cust.status}, not ACTIVE."
            )

        # Auto-flag low-confidence check-ins
        needs_review = False
        review_reason = ""
        if gps_accuracy_meters is not None:
            try:
                accuracy = float(gps_accuracy_meters)
                if accuracy > GPS_ACCURACY_THRESHOLD_METERS:
                    needs_review = True
                    review_reason = (
                        f"GPS accuracy {accuracy:.1f}m exceeds "
                        f"{GPS_ACCURACY_THRESHOLD_METERS}m threshold"
                    )
            except (TypeError, ValueError):
                pass

        checkin = LocationCheckIn.objects.create(
            custodianship=cust,
            latitude=coordinates["latitude"],
            longitude=coordinates["longitude"],
            checked_in_by=checked_in_by,
            source=source,
            photo=photo,
            notes=notes,
            gps_accuracy_meters=gps_accuracy_meters,
            gps_altitude_meters=gps_altitude_meters,
            gps_speed_mps=gps_speed_mps,
            needs_review=needs_review,
            review_reason=review_reason,
        )

        # Update the geo tag's last_checkin timestamp
        geo_tag = cust.geo_tag
        geo_tag.last_checkin = checkin.checked_in_at
        if source == LocationCheckIn.CheckInSource.GPS_DEVICE:
            geo_tag.last_device_ping = checkin.checked_in_at
        geo_tag.save(update_fields=["last_checkin", "last_device_ping", "updated_at"])

    return checkin


def handoff_custodianship(geo_tag, new_caretaker, end_reason, coordinates,
                          exit_condition, intake_condition, processed_by=None,
                          linked_dispersal_record=None):
    """
    Transfer custodianship to a new caretaker — the core "adoption transfer" operation.

    Atomically closes the current ACTIVE Custodianship and opens a new one.
    """
    _validate_coordinates(coordinates.get("latitude"), coordinates.get("longitude"))

    with transaction.atomic():
        gt = GeoTag.objects.select_for_update().get(pk=geo_tag.pk)

        if not gt.is_active:
            raise TagRetiredError(f"Tag {gt.tag_code} is retired.")

        # Find the current active custodianship
        active_custs = list(
            Custodianship.objects.select_for_update().filter(
                geo_tag=gt, status=Custodianship.RecordStatus.ACTIVE
            )
        )

        if len(active_custs) == 0:
            raise NoActiveCustodianshipError(
                f"Tag {gt.tag_code} has no active custodianship to close."
            )
        elif len(active_custs) > 1:
            raise MultipleActiveCustodianshipsError(
                f"Data integrity violation: tag {gt.tag_code} has {len(active_custs)} active custodianships."
            )

        current = active_custs[0]
        today = timezone.now().date()

        # Close the current custodianship
        current.end_date = today
        current.end_latitude = coordinates.get("latitude")
        current.end_longitude = coordinates.get("longitude")
        current.end_reason = end_reason
        current.exit_condition = exit_condition
        current.status = Custodianship.RecordStatus.CLOSED
        current.save(update_fields=[
            "end_date", "end_latitude", "end_longitude",
            "end_reason", "exit_condition", "status",
        ])

        # Open a new custodianship
        new_cust = Custodianship.objects.create(
            geo_tag=gt,
            caretaker=new_caretaker,
            linked_dispersal_record=linked_dispersal_record,
            start_date=today,
            start_latitude=coordinates.get("latitude"),
            start_longitude=coordinates.get("longitude"),
            intake_condition=intake_condition,
            status=Custodianship.RecordStatus.ACTIVE,
        )

    return new_cust


def retire_tag(geo_tag, reason=None):
    """
    Retire a geo tag (lost tag, deceased animal, program ending).

    Closes the final active custodianship with no successor.
    """
    with transaction.atomic():
        gt = GeoTag.objects.select_for_update().get(pk=geo_tag.pk)

        if not gt.is_active:
            raise TagRetiredError(f"Tag {gt.tag_code} is already retired.")

        # Close active custodianship if one exists
        active_custs = Custodianship.objects.select_for_update().filter(
            geo_tag=gt, status=Custodianship.RecordStatus.ACTIVE
        )

        today = timezone.now().date()
        for cust in active_custs:
            cust.end_date = today
            cust.end_reason = reason
            cust.exit_condition = Custodianship.ExitCondition.HEALTHY
            cust.status = Custodianship.RecordStatus.CLOSED
            cust.save(update_fields=["end_date", "end_reason", "exit_condition", "status"])

        # Retire the tag
        gt.is_active = False
        gt.save(update_fields=["is_active", "updated_at"])

    return gt


def sync_custodianship_from_dispersal(ownership_record):
    """
    Integration hook: called after disperse_animal() / redisperse_animal().

    Ensures a GeoTag and Custodianship exist and are in sync with the
    formal dispersal transaction.
    """
    animal = ownership_record.animal
    beneficiary = ownership_record.beneficiary

    with transaction.atomic():
        # 1. Ensure GeoTag exists — auto-create if first dispersal
        geo_tag, created = GeoTag.objects.get_or_create(
            animal=animal,
            defaults={
                "tag_type": GeoTag.TagType.QR_ONLY,
                "tagged_by": ownership_record.processed_by,
                "is_active": True,
            },
        )

        # 2. Ensure Caretaker exists linked to this Beneficiary
        caretaker, _ = Caretaker.objects.get_or_create(
            beneficiary=beneficiary,
            defaults={
                "full_name": beneficiary.full_name,
                "contact_number": beneficiary.contact_number,
                "barangay": beneficiary.barangay,
                "address_text": beneficiary.full_address,
                "caretaker_type": Caretaker.CaretakerType.FORMAL_BENEFICIARY,
                "default_latitude": beneficiary.latitude,
                "default_longitude": beneficiary.longitude,
            },
        )

        # 3. Close prior active custodianship if any
        today = timezone.now().date()
        active_custs = Custodianship.objects.select_for_update().filter(
            geo_tag=geo_tag, status=Custodianship.RecordStatus.ACTIVE
        )

        for cust in active_custs:
            cust.end_date = today
            cust.end_latitude = ownership_record.start_latitude
            cust.end_longitude = ownership_record.start_longitude
            cust.end_reason = HandoffReason.objects.filter(
                name__icontains="formal re-dispersal"
            ).first() or HandoffReason.objects.first()
            cust.exit_condition = Custodianship.ExitCondition.HEALTHY
            cust.status = Custodianship.RecordStatus.CLOSED
            cust.save(update_fields=[
                "end_date", "end_latitude", "end_longitude",
                "end_reason", "exit_condition", "status",
            ])

        # 4. Open new custodianship linked to the dispersal record
        new_cust = Custodianship.objects.create(
            geo_tag=geo_tag,
            caretaker=caretaker,
            linked_dispersal_record=ownership_record,
            start_date=ownership_record.start_date or today,
            start_latitude=ownership_record.start_latitude,
            start_longitude=ownership_record.start_longitude,
            intake_condition=Custodianship.IntakeCondition.HEALTHY,
            status=Custodianship.RecordStatus.ACTIVE,
        )

    return new_cust


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_custody_lineage(geo_tag):
    """
    Return the full ordered custodianship history for a GeoTag,
    stitching together replacement tags for a continuous lineage view.
    """
    # Collect all related tags (this one + any it replaced + any replacements of it)
    tag_ids = set()
    tag_ids.add(geo_tag.pk)

    # Walk up the replacement chain
    current = geo_tag
    while current.replacement_of_id:
        tag_ids.add(current.replacement_of_id)
        current = current.replacement_of

    # Walk down the replacement chain
    replacements = geo_tag.replacements.all()
    for r in replacements:
        tag_ids.add(r.pk)

    return Custodianship.objects.filter(
        geo_tag_id__in=tag_ids
    ).select_related(
        "caretaker", "caretaker__barangay", "end_reason", "linked_dispersal_record"
    ).order_by("start_date")


def get_active_geo_locations(filters=None):
    """
    Return all active custodianship points as GeoJSON features
    for map rendering. Independent of the dispersal module's map endpoint.
    """
    qs = Custodianship.objects.filter(
        status=Custodianship.RecordStatus.ACTIVE,
        start_latitude__isnull=False,
    ).select_related(
        "geo_tag", "geo_tag__animal", "geo_tag__animal__species",
        "caretaker", "caretaker__barangay",
    )

    if filters:
        if filters.get("species"):
            qs = qs.filter(geo_tag__animal__species_id=filters["species"])
        if filters.get("barangay"):
            qs = qs.filter(caretaker__barangay_id=filters["barangay"])
        if filters.get("caretaker_type"):
            qs = qs.filter(caretaker__caretaker_type=filters["caretaker_type"])

    features = []
    for cust in qs:
        animal = cust.geo_tag.animal
        caretaker = cust.caretaker
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    float(cust.start_longitude),
                    float(cust.start_latitude),
                ],
            },
            "properties": {
                "custodianship_id": cust.id,
                "geo_tag_id": cust.geo_tag.id,
                "tag_code": cust.geo_tag.tag_code,
                "tag_type": cust.geo_tag.tag_type,
                "animal_id": animal.id,
                "animal_tag": animal.tag_id,
                "species": animal.species.name if animal.species else None,
                "sex": animal.sex,
                "caretaker_id": caretaker.id,
                "caretaker_name": caretaker.full_name,
                "caretaker_type": caretaker.caretaker_type,
                "barangay": caretaker.barangay.name if caretaker.barangay else None,
                "start_date": str(cust.start_date),
                "intake_condition": cust.intake_condition,
                "has_dispersion_link": cust.linked_dispersal_record is not None,
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def get_custody_trail(geo_tag):
    """
    Return the full historical movement trail as a GeoJSON LineString,
    combining every custody start point and every check-in chronologically.
    """
    # All custodianships for this tag (including replaced tags)
    tag_ids = set()
    tag_ids.add(geo_tag.pk)
    current = geo_tag
    while current.replacement_of_id:
        tag_ids.add(current.replacement_of_id)
        current = current.replacement_of
    for r in geo_tag.replacements.all():
        tag_ids.add(r.pk)

    # Gather custody start points
    points = []
    custs = Custodianship.objects.filter(
        geo_tag_id__in=tag_ids,
        start_latitude__isnull=False,
    ).select_related("caretaker").order_by("start_date")

    for cust in custs:
        points.append({
            "latitude": float(cust.start_latitude),
            "longitude": float(cust.start_longitude),
            "date": str(cust.start_date),
            "caretaker_name": cust.caretaker.full_name,
            "type": "custody_start",
        })

    # Gather check-in points
    checkins = LocationCheckIn.objects.filter(
        custodianship__geo_tag_id__in=tag_ids,
    ).select_related("custodianship").order_by("checked_in_at")

    for ci in checkins:
        points.append({
            "latitude": float(ci.latitude),
            "longitude": float(ci.longitude),
            "date": ci.checked_in_at.isoformat(),
            "source": ci.source,
            "type": "checkin",
        })

    # Sort chronologically
    points.sort(key=lambda p: p["date"])

    # Build GeoJSON
    coordinates = [[p["longitude"], p["latitude"]] for p in points]

    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString" if len(coordinates) >= 2 else "Point",
            "coordinates": coordinates if len(coordinates) >= 2 else coordinates[0] if coordinates else [],
        },
        "properties": {
            "tag_code": geo_tag.tag_code,
            "animal_tag": geo_tag.animal.tag_id,
            "points": points,
        },
    }

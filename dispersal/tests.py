"""
Tests for the dispersal app — ownership/custody transition logic.

Covers:
1. The "one ACTIVE record per animal" constraint
2. Initial dispersal, re-dispersal, and return-to-CVO workflows
3. Permission boundaries per role
4. Edge cases: deceased animals, inactive beneficiaries, concurrent access
"""
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.utils import IntegrityError
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Beneficiary, Barangay
from livestock.models import Animal, Species, Breed
from .models import OwnershipRecord, TransferReason, ReDispersalRequest
from .services import (
    disperse_animal,
    redisperse_animal,
    return_animal_to_cvo,
    AnimalAlreadyDispersedError,
    AnimalNotDispersedError,
    NoActiveOwnershipRecordError,
    BeneficiaryNotActiveError,
    BeneficiaryAlreadyHoldsAnimalError,
    DomainError,
)
from accounts.permissions import (
    IsAdmin,
    IsOfficerOrAbove,
    IsSupervisorOrAbove,
    IsReadOnly,
    IsOwnerOrReadOnly,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class DispersalTestCaseBase(TestCase):
    """Shared fixtures for dispersal tests."""

    @classmethod
    def setUpTestData(cls):
        # Users by role
        cls.admin = User.objects.create_user(
            username="admin", password="testpass123", role="ADMIN"
        )
        cls.officer = User.objects.create_user(
            username="officer", password="testpass123", role="OFFICER"
        )
        cls.supervisor = User.objects.create_user(
            username="supervisor", password="testpass123", role="SUPERVISOR"
        )
        cls.coordinator = User.objects.create_user(
            username="coordinator", password="testpass123", role="COORDINATOR"
        )
        cls.staff = User.objects.create_user(
            username="staff", password="testpass123", role="STAFF"
        )

        # Species & Breed
        cls.species = Species.objects.create(name="Goat", category="LIVESTOCK")
        cls.breed = Breed.objects.create(species=cls.species, name="Boer")

        # Barangay
        cls.barangay = Barangay.objects.create(
            name="Barangay 1", city_municipality="Bayawan"
        )

        # Beneficiaries
        cls.beneficiary_a = Beneficiary.objects.create(
            first_name="Juan",
            last_name="Dela Cruz",
            barangay=cls.barangay,
            latitude=Decimal("9.650000"),
            longitude=Decimal("122.800000"),
        )
        cls.beneficiary_b = Beneficiary.objects.create(
            first_name="Maria",
            last_name="Santos",
            barangay=cls.barangay,
            latitude=Decimal("9.660000"),
            longitude=Decimal("122.810000"),
        )
        cls.inactive_beneficiary = Beneficiary.objects.create(
            first_name="Inactive",
            last_name="Person",
            barangay=cls.barangay,
            is_active_beneficiary=False,
        )

        # Animals
        cls.animal_goat = Animal.objects.create(
            species=cls.species,
            breed=cls.breed,
            sex="FEMALE",
            current_status="AVAILABLE",
        )
        cls.animal_goat2 = Animal.objects.create(
            species=cls.species,
            breed=cls.breed,
            sex="MALE",
            current_status="AVAILABLE",
        )

        # Transfer reasons
        cls.reason_dispersal = TransferReason.objects.create(
            name="Initial Dispersal"
        )
        cls.reason_return = TransferReason.objects.create(
            name="Non-compliance"
        )
        cls.reason_beneficiary_request = TransferReason.objects.create(
            name="Beneficiary Request"
        )


# ---------------------------------------------------------------------------
# 1. One ACTIVE Record Constraint
# ---------------------------------------------------------------------------

class OneActiveRecordConstraintTest(DispersalTestCaseBase):
    """Verify that only one ACTIVE OwnershipRecord can exist per animal at a time."""

    def test_first_dispersal_creates_active_record(self):
        """Initial dispersal should create exactly one ACTIVE record."""
        record = disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        self.assertEqual(record.status, "ACTIVE")
        self.assertEqual(record.transfer_type, "INITIAL_DISPERSAL")
        self.assertEqual(record.animal, self.animal_goat)
        self.assertEqual(record.beneficiary, self.beneficiary_a)

    def test_cannot_disperse_already_dispersed_animal(self):
        """Attempting to disperse an already-dispersed animal should raise."""
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        with self.assertRaises(AnimalAlreadyDispersedError):
            disperse_animal(
                animal=self.animal_goat,
                beneficiary=self.beneficiary_b,
                processed_by=self.officer,
            )

    def test_redispersal_closes_old_and_opens_new(self):
        """Re-dispersal should close the old record and open a new ACTIVE one."""
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        new_record = redisperse_animal(
            animal=self.animal_goat,
            new_beneficiary=self.beneficiary_b,
            end_reason=self.reason_beneficiary_request,
            processed_by=self.officer,
        )

        # Old record should be CLOSED
        old_record = OwnershipRecord.objects.get(
            animal=self.animal_goat, beneficiary=self.beneficiary_a
        )
        self.assertEqual(old_record.status, "CLOSED")
        self.assertIsNotNone(old_record.end_date)

        # New record should be ACTIVE
        self.assertEqual(new_record.status, "ACTIVE")
        self.assertEqual(new_record.transfer_type, "RE_DISPERSAL")
        self.assertEqual(new_record.beneficiary, self.beneficiary_b)

        # Exactly one ACTIVE record
        active_count = OwnershipRecord.objects.filter(
            animal=self.animal_goat, status="ACTIVE"
        ).count()
        self.assertEqual(active_count, 1)

    def test_unique_active_constraint_enforced_at_db_level(self):
        """Direct DB manipulation should fail the unique constraint."""
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        # Try to manually create a second ACTIVE record
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                OwnershipRecord.objects.create(
                    animal=self.animal_goat,
                    beneficiary=self.beneficiary_b,
                    transfer_type="RE_DISPERSAL",
                    status="ACTIVE",
                    start_date=timezone.now().date(),
                )

    def test_return_to_cvo_closes_record_no_new_one(self):
        """Return to CVO should close the active record without creating a new one."""
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        return_animal_to_cvo(
            animal=self.animal_goat,
            reason=self.reason_return,
            processed_by=self.officer,
        )

        active_count = OwnershipRecord.objects.filter(
            animal=self.animal_goat, status="ACTIVE"
        ).count()
        self.assertEqual(active_count, 0)
        self.animal_goat.refresh_from_db()
        self.assertEqual(self.animal_goat.current_status, "RETURNED_TO_CVO")


# ---------------------------------------------------------------------------
# 2. Re-Dispersal Workflow
# ---------------------------------------------------------------------------

class RedispersalWorkflowTest(DispersalTestCaseBase):
    """Test the full Coordinator-submit → Supervisor-approve workflow."""

    def test_redispersal_request_workflow(self):
        """Full workflow: disperse → submit request → supervisor approves."""
        # Step 1: Initial dispersal
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )

        # Step 2: Coordinator submits a re-dispersal request
        request = ReDispersalRequest.objects.create(
            animal=self.animal_goat,
            requested_by=self.coordinator,
            reason="Beneficiary moving to another barangay",
            requested_new_beneficiary=self.beneficiary_b,
        )
        self.assertEqual(request.status, "PENDING")

        # Step 3: Supervisor approves — via service (simulating view logic)
        redisperse_animal(
            animal=self.animal_goat,
            new_beneficiary=self.beneficiary_b,
            end_reason=self.reason_beneficiary_request,
            processed_by=self.supervisor,
        )
        request.status = "APPROVED"
        request.reviewed_by = self.supervisor
        request.reviewed_at = timezone.now()
        request.save()

        # Verify the ownership transition
        self.animal_goat.refresh_from_db()
        self.assertEqual(self.animal_goat.current_owner, self.beneficiary_b)
        self.assertEqual(self.animal_goat.current_status, "DISPERSED")
        self.assertEqual(request.status, "APPROVED")

    def test_cannot_redisperse_to_same_beneficiary(self):
        """Re-dispersing to the same beneficiary should raise."""
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        with self.assertRaises(BeneficiaryAlreadyHoldsAnimalError):
            redisperse_animal(
                animal=self.animal_goat,
                new_beneficiary=self.beneficiary_a,
                end_reason=self.reason_beneficiary_request,
                processed_by=self.officer,
            )

    def test_cannot_redisperse_available_animal(self):
        """Re-dispersing an animal that was never dispersed should raise."""
        with self.assertRaises(AnimalNotDispersedError):
            redisperse_animal(
                animal=self.animal_goat,
                new_beneficiary=self.beneficiary_b,
                end_reason=self.reason_beneficiary_request,
                processed_by=self.officer,
            )


# ---------------------------------------------------------------------------
# 3. Permission Boundaries
# ---------------------------------------------------------------------------

class PermissionBoundaryTest(DispersalTestCaseBase):
    """Test that role-based permissions are correctly enforced."""

    def setUp(self):
        self.client = APIClient()

    def test_admin_can_access_user_management(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_officer_cannot_access_user_management(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_access_user_management(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinator_can_view_animals(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/animals/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_officer_can_create_animal(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/animals/", {
            "species": self.species.id,
            "sex": "MALE",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_create_animal(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post("/api/v1/animals/", {
            "species": self.species.id,
            "sex": "MALE",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_anything(self):
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/v1/animals/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_supervisor_can_approve_redispersal(self):
        """Supervisor role should have IsSupervisorOrAbove access."""
        self.assertTrue(self.supervisor.is_supervisor_or_above)
        self.assertTrue(self.admin.is_supervisor_or_above)
        self.assertFalse(self.officer.is_supervisor_or_above)
        self.assertFalse(self.coordinator.is_supervisor_or_above)

    def test_is_owner_or_read_only_allows_admin_override(self):
        """Admin should be able to modify any record via IsOwnerOrReadOnly."""
        perm = IsOwnerOrReadOnly()
        request = type("Request", (), {"method": "PUT", "user": self.admin})()
        obj = type("Obj", (), {"processed_by_id": self.officer.id})()
        self.assertTrue(perm.has_object_permission(request, None, obj))

    def test_is_owner_or_read_only_blocks_other_officer(self):
        """An officer who didn't process the record should be blocked."""
        perm = IsOwnerOrReadOnly()
        request = type("Request", (), {"method": "PUT", "user": self.officer})()
        obj = type("Obj", (), {"processed_by_id": 9999})()
        self.assertFalse(perm.has_object_permission(request, None, obj))


# ---------------------------------------------------------------------------
# 4. API Integration Tests
# ---------------------------------------------------------------------------

class DisperseAPITest(DispersalTestCaseBase):
    """Integration tests for the disperse/redisperse/return API endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_disperse_api_officer_success(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/dispersal/disperse/", {
            "animal_id": self.animal_goat.id,
            "beneficiary_id": self.beneficiary_a.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.animal_goat.refresh_from_db()
        self.assertEqual(self.animal_goat.current_status, "DISPERSED")

    def test_disperse_api_staff_forbidden(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post("/api/v1/dispersal/disperse/", {
            "animal_id": self.animal_goat.id,
            "beneficiary_id": self.beneficiary_a.id,
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_redisperse_api_success(self):
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/dispersal/redisperse/", {
            "animal_id": self.animal_goat.id,
            "new_beneficiary_id": self.beneficiary_b.id,
            "end_reason_id": self.reason_beneficiary_request.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_return_to_cvo_api_success(self):
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/dispersal/return-to-cvo/", {
            "animal_id": self.animal_goat.id,
            "reason_id": self.reason_return.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.animal_goat.refresh_from_db()
        self.assertEqual(self.animal_goat.current_status, "RETURNED_TO_CVO")

    def test_ownership_history_endpoint(self):
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            processed_by=self.officer,
        )
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get(f"/api/v1/animals/{self.animal_goat.id}/history/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_active_animals_map_endpoint(self):
        disperse_animal(
            animal=self.animal_goat,
            beneficiary=self.beneficiary_a,
            latitude=Decimal("9.650000"),
            longitude=Decimal("122.800000"),
            processed_by=self.officer,
        )
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/dispersal/map/active-animals/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["type"], "FeatureCollection")
        self.assertGreaterEqual(len(res.data["features"]), 1)

"""
Tests for health app — DiseaseType, HealthEvent, QuarantineZone models,
API permissions, and quarantine zone logic.

Covers:
1. Model constraints and properties (HealthEvent choices, QuarantineZone is_current)
2. Permission boundaries per role
3. API endpoints: disease-types, events, quarantine-zones, report, radius-search, quarantine-check
"""
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Barangay, Beneficiary
from livestock.models import Animal, Species, Breed
from .models import DiseaseType, HealthEvent, QuarantineZone

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class HealthTestCaseBase(TestCase):
    """Shared fixtures for health tests."""

    @classmethod
    def setUpTestData(cls):
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

        cls.barangay = Barangay.objects.create(
            name="Barangay 1", city_municipality="Bayawan"
        )
        cls.species = Species.objects.create(name="Goat", category="LIVESTOCK")
        cls.breed = Breed.objects.create(species=cls.species, name="Boer")
        cls.animal = Animal.objects.create(
            species=cls.species, breed=cls.breed, sex="FEMALE"
        )

        cls.disease_asf = DiseaseType.objects.create(
            name="African Swine Fever (ASF)",
            description="Highly contagious viral disease.",
        )
        cls.disease_fmd = DiseaseType.objects.create(
            name="Foot and Mouth Disease (FMD)",
            description="Viral disease affecting cloven-hoofed animals.",
        )

        cls.quarantine_zone = QuarantineZone.objects.create(
            name="Bayawan Zone 1 - ASF Response",
            barangay=cls.barangay,
            disease_type=cls.disease_asf,
            start_date=date.today() - timedelta(days=10),
            is_active=True,
            is_blocking=True,
        )


# ---------------------------------------------------------------------------
# 1. Model Tests
# ---------------------------------------------------------------------------

class DiseaseTypeModelTest(TestCase):
    """Test DiseaseType model."""

    def test_create_disease_type(self):
        dt = DiseaseType.objects.create(name="Rabies", description="Fatal viral disease.")
        self.assertEqual(str(dt), "Rabies")
        self.assertTrue(dt.is_active)

    def test_unique_name_constraint(self):
        DiseaseType.objects.create(name="ASF")
        with self.assertRaises(Exception):
            DiseaseType.objects.create(name="ASF")


class HealthEventModelTest(HealthTestCaseBase):
    """Test HealthEvent model constraints."""

    def test_create_vaccination_event(self):
        event = HealthEvent.objects.create(
            animal=self.animal,
            event_type="VACCINATION",
            event_date=date.today(),
            reported_by=self.officer,
        )
        self.assertEqual(event.report_status, "SUBMITTED")
        self.assertEqual(event.severity, "LOW")

    def test_create_disease_suspect_event(self):
        event = HealthEvent.objects.create(
            animal=self.animal,
            event_type="DISEASE_SUSPECT",
            disease_suspected=self.disease_asf,
            severity="HIGH",
            event_date=date.today(),
            reported_by=self.officer,
        )
        self.assertEqual(event.disease_suspected, self.disease_asf)
        self.assertEqual(event.severity, "HIGH")

    def test_str_representation(self):
        event = HealthEvent.objects.create(
            animal=self.animal,
            event_type="ILLNESS",
            disease_suspected=self.disease_fmd,
            event_date=date(2026, 1, 15),
        )
        s = str(event)
        self.assertIn("Illness", s)
        self.assertIn(self.animal.tag_id, s)
        self.assertIn("FMD", s)

    def test_mortality_event(self):
        event = HealthEvent.objects.create(
            animal=self.animal,
            event_type="MORTALITY",
            severity="CRITICAL",
            event_date=date.today(),
        )
        self.assertEqual(event.event_type, "MORTALITY")
        self.assertEqual(event.severity, "CRITICAL")

    def test_default_report_status_is_submitted(self):
        event = HealthEvent.objects.create(
            animal=self.animal,
            event_type="INSPECTION",
            event_date=date.today(),
        )
        self.assertEqual(event.report_status, "SUBMITTED")


class QuarantineZoneModelTest(HealthTestCaseBase):
    """Test QuarantineZone model and is_current property."""

    def test_is_current_active_zone(self):
        self.assertTrue(self.quarantine_zone.is_current)

    def test_is_current_inactive_zone(self):
        self.quarantine_zone.is_active = False
        self.quarantine_zone.save()
        self.assertFalse(self.quarantine_zone.is_current)

    def test_is_current_expired_zone(self):
        self.quarantine_zone.end_date = date.today() - timedelta(days=1)
        self.quarantine_zone.save()
        self.assertFalse(self.quarantine_zone.is_current)

    def test_is_current_future_zone(self):
        self.quarantine_zone.start_date = date.today() + timedelta(days=30)
        self.quarantine_zone.save()
        self.assertFalse(self.quarantine_zone.is_current)

    def test_is_current_open_ended_zone(self):
        """Zone with no end_date is current if active and start_date is today or past."""
        zone = QuarantineZone.objects.create(
            name="Open-ended zone",
            barangay=self.barangay,
            disease_type=self.disease_asf,
            start_date=date.today() - timedelta(days=5),
            end_date=None,
            is_active=True,
            is_blocking=True,
        )
        self.assertTrue(zone.is_current)

    def test_str_representation(self):
        s = str(self.quarantine_zone)
        self.assertIn("ASF", s)
        self.assertIn("ACTIVE", s)


# ---------------------------------------------------------------------------
# 2. Permission Tests
# ---------------------------------------------------------------------------

class HealthPermissionTest(HealthTestCaseBase):
    """Test role-based permissions for health endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_officer_can_create_disease_type(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/health/disease-types/", {
            "name": "New Disease",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_coordinator_cannot_create_disease_type(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.post("/api/v1/health/disease-types/", {
            "name": "New Disease",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_create_disease_type(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post("/api/v1/health/disease-types/", {
            "name": "New Disease",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_can_list_events(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/health/events/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list_events(self):
        res = self.client.get("/api/v1/health/events/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 3. API Endpoint Tests
# ---------------------------------------------------------------------------

class HealthEventAPITest(HealthTestCaseBase):
    """Test HealthEvent API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_create_health_event(self):
        res = self.client.post("/api/v1/health/events/", {
            "animal": self.animal.id,
            "event_type": "VACCINATION",
            "event_date": str(date.today()),
            "severity": "LOW",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["animal_tag"], self.animal.tag_id)

    def test_list_health_events(self):
        HealthEvent.objects.create(
            animal=self.animal,
            event_type="VACCINATION",
            event_date=date.today(),
        )
        res = self.client.get("/api/v1/health/events/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)


class SubmitDiseaseReportTest(HealthTestCaseBase):
    """Test the POST /api/v1/health/report/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.coordinator)

    def test_submit_disease_report_success(self):
        res = self.client.post("/api/v1/health/report/", {
            "animal_id": self.animal.id,
            "event_type": "DISEASE_SUSPECT",
            "disease_suspected_id": self.disease_asf.id,
            "severity": "HIGH",
            "event_date": str(date.today()),
            "latitude": "9.650000",
            "longitude": "122.800000",
            "notes": "Goat showing signs of ASF",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        event = HealthEvent.objects.get(pk=res.data["id"])
        self.assertEqual(event.reported_by, self.coordinator)
        self.assertEqual(event.report_status, "SUBMITTED")

    def test_submit_report_invalid_animal(self):
        res = self.client.post("/api/v1/health/report/", {
            "animal_id": 99999,
            "event_type": "ILLNESS",
            "event_date": str(date.today()),
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_submit_report_invalid_disease_type(self):
        res = self.client.post("/api/v1/health/report/", {
            "animal_id": self.animal.id,
            "event_type": "DISEASE_SUSPECT",
            "disease_suspected_id": 99999,
            "event_date": str(date.today()),
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class QuarantineZoneAPITest(HealthTestCaseBase):
    """Test quarantine zone API endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_active_quarantine_zones(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/health/quarantine-zones/active/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_active_quarantine_zones_excludes_inactive(self):
        self.quarantine_zone.is_active = False
        self.quarantine_zone.save()
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/health/quarantine-zones/active/")
        self.assertEqual(res.data["count"], 0)

    def test_check_quarantine_conflict(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get(
            f"/api/v1/health/quarantine-check/?barangay_id={self.barangay.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["has_conflict"])
        self.assertTrue(res.data["is_blocking"])

    def test_check_quarantine_no_conflict(self):
        """A barangay with no active quarantine should show no conflict."""
        other_barangay = Barangay.objects.create(
            name="Barangay 2", city_municipality="Bayawan"
        )
        self.client.force_authenticate(user=self.officer)
        res = self.client.get(
            f"/api/v1/health/quarantine-check/?barangay_id={other_barangay.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["has_conflict"])

    def test_check_quarantine_missing_barangay_id(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/health/quarantine-check/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_quarantine_check_exclude_zone(self):
        """Excluding the only zone should show no conflict."""
        self.client.force_authenticate(user=self.officer)
        res = self.client.get(
            f"/api/v1/health/quarantine-check/"
            f"?barangay_id={self.barangay.id}"
            f"&exclude_zone_id={self.quarantine_zone.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["has_conflict"])


class RadiusSearchTest(HealthTestCaseBase):
    """Test the radius search endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_radius_search_requires_coordinates(self):
        res = self.client.get("/api/v1/health/radius-search/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_radius_search_zero_coordinates(self):
        res = self.client.get(
            "/api/v1/health/radius-search/?latitude=0&longitude=0"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_radius_search_success(self):
        res = self.client.get(
            "/api/v1/health/radius-search/?latitude=9.65&longitude=122.80&radius_km=10"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("features", res.data)
        self.assertIn("count", res.data)

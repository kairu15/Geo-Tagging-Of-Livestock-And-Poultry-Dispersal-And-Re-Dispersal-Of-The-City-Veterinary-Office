"""
Tests for reports app — report views and permissions.

Covers:
1. Dispersal summary endpoint
2. Re-dispersal frequency endpoint
3. CSV export endpoint
4. Overdue offspring endpoint
5. Public dashboard endpoint (no auth required)
6. Permission boundaries per role
"""
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Barangay, Beneficiary
from livestock.models import Animal, Species, Breed
from dispersal.models import OwnershipRecord, TransferReason
from dispersal.services import disperse_animal, redisperse_animal

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class ReportsTestCaseBase(TestCase):
    """Shared fixtures."""

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
            name="Poblacion", city_municipality="Bayawan"
        )
        cls.species = Species.objects.create(name="Goat", category="LIVESTOCK")
        cls.breed = Breed.objects.create(species=cls.species, name="Boer")

        cls.beneficiary_a = Beneficiary.objects.create(
            first_name="Juan", last_name="Dela Cruz",
            barangay=cls.barangay,
            latitude=Decimal("9.650000"), longitude=Decimal("122.800000"),
        )
        cls.beneficiary_b = Beneficiary.objects.create(
            first_name="Maria", last_name="Santos",
            barangay=cls.barangay,
            latitude=Decimal("9.660000"), longitude=Decimal("122.810000"),
        )

        cls.reason = TransferReason.objects.create(name="Non-compliance")

        # Create animals
        cls.animal1 = Animal.objects.create(
            species=cls.species, breed=cls.breed, sex="FEMALE"
        )
        cls.animal2 = Animal.objects.create(
            species=cls.species, breed=cls.breed, sex="MALE"
        )
        cls.animal3 = Animal.objects.create(
            species=cls.species, breed=cls.breed, sex="FEMALE"
        )

        # Create dispersal records
        disperse_animal(
            animal=cls.animal1,
            beneficiary=cls.beneficiary_a,
            latitude=Decimal("9.650000"),
            longitude=Decimal("122.800000"),
            processed_by=cls.officer,
        )
        redisperse_animal(
            animal=cls.animal1,
            new_beneficiary=cls.beneficiary_b,
            end_reason=cls.reason,
            processed_by=cls.officer,
        )
        disperse_animal(
            animal=cls.animal2,
            beneficiary=cls.beneficiary_b,
            latitude=Decimal("9.660000"),
            longitude=Decimal("122.810000"),
            processed_by=cls.officer,
        )

        # Create an overdue record (active for 400+ days)
        cls.overdue_animal = Animal.objects.create(
            species=cls.species, breed=cls.breed, sex="MALE"
        )
        cls.overdue_beneficiary = Beneficiary.objects.create(
            first_name="Overdue", last_name="Person",
            barangay=cls.barangay,
        )
        OwnershipRecord.objects.create(
            animal=cls.overdue_animal,
            beneficiary=cls.overdue_beneficiary,
            transfer_type="INITIAL_DISPERSAL",
            status="ACTIVE",
            start_date=date.today() - timedelta(days=400),
            processed_by=cls.officer,
        )


# ---------------------------------------------------------------------------
# 1. Permission Tests
# ---------------------------------------------------------------------------

class ReportsPermissionTest(ReportsTestCaseBase):
    def setUp(self):
        self.client = APIClient()

    def test_authenticated_can_access_summary(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_access_summary(self):
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_can_access_reports(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_coordinator_can_access_reports(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 2. Dispersal Summary Tests
# ---------------------------------------------------------------------------

class DispersalSummaryTest(ReportsTestCaseBase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_summary_counts(self):
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # 3 initial dispersals (animal1, animal2, overdue_animal) + 1 re-dispersal
        self.assertEqual(res.data["total_dispersals"], 3)
        self.assertEqual(res.data["total_redispersals"], 1)

    def test_summary_by_species(self):
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        by_species = res.data["by_species"]
        self.assertGreaterEqual(len(by_species), 1)
        goat_data = next(s for s in by_species if s["animal__species__name"] == "Goat")
        self.assertEqual(goat_data["dispersals"], 3)

    def test_summary_by_barangay(self):
        res = self.client.get("/api/v1/reports/dispersal-summary/")
        by_barangay = res.data["by_barangay"]
        self.assertGreaterEqual(len(by_barangay), 1)

    def test_filter_by_species(self):
        res = self.client.get(
            f"/api/v1/reports/dispersal-summary/?species={self.species.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # 3 initial dispersals total for Goat species
        self.assertEqual(res.data["total_dispersals"], 3)

    def test_filter_by_barangay(self):
        res = self.client.get(
            f"/api/v1/reports/dispersal-summary/?barangay={self.barangay.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 3. Re-Dispersal Frequency Tests
# ---------------------------------------------------------------------------

class RedispersalFrequencyTest(ReportsTestCaseBase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_frequency_endpoint(self):
        res = self.client.get("/api/v1/reports/redispersal-frequency/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("most_transferred_animals", res.data)
        self.assertIn("most_active_beneficiaries", res.data)

    def test_most_transferred_animals(self):
        res = self.client.get("/api/v1/reports/redispersal-frequency/")
        # animal1 was transferred twice (initial + re-dispersal)
        transferred = res.data["most_transferred_animals"]
        self.assertGreaterEqual(len(transferred), 1)
        animal1_data = next(
            a for a in transferred if a["tag_id"] == self.animal1.tag_id
        )
        self.assertEqual(animal1_data["transfer_count"], 2)

    def test_most_active_beneficiaries(self):
        res = self.client.get("/api/v1/reports/redispersal-frequency/")
        active = res.data["most_active_beneficiaries"]
        self.assertGreaterEqual(len(active), 1)


# ---------------------------------------------------------------------------
# 4. CSV Export Tests
# ---------------------------------------------------------------------------

class CSVExportTest(ReportsTestCaseBase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_csv_export(self):
        res = self.client.get("/api/v1/reports/dispersal-export/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res["Content-Type"], "text/csv")
        self.assertIn("dispersal_report.csv", res["Content-Disposition"])
        content = res.content.decode("utf-8")
        self.assertIn("Animal Tag", content)
        self.assertIn(self.animal1.tag_id, content)

    def test_csv_export_with_filter(self):
        res = self.client.get(
            f"/api/v1/reports/dispersal-export/?species={self.species.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 5. Overdue Offspring Tests
# ---------------------------------------------------------------------------

class OverdueOffspringTest(ReportsTestCaseBase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_overdue_endpoint(self):
        res = self.client.get("/api/v1/reports/overdue-offspring/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("summary", res.data)
        self.assertIn("results", res.data)

    def test_overdue_finds_long_active_records(self):
        res = self.client.get("/api/v1/reports/overdue-offspring/?overdue_days=365")
        results = res.data["results"]
        tags = [r["animal_tag"] for r in results]
        self.assertIn(self.overdue_animal.tag_id, tags)

    def test_overdue_with_short_threshold(self):
        """With a very short threshold, recently dispersed animals should also appear."""
        res = self.client.get("/api/v1/reports/overdue-offspring/?overdue_days=1")
        results = res.data["results"]
        # Should include the overdue animal at minimum
        self.assertGreaterEqual(len(results), 1)

    def test_overdue_summary_by_species(self):
        res = self.client.get("/api/v1/reports/overdue-offspring/?overdue_days=365")
        summary = res.data["summary"]
        self.assertIn("by_species", summary)
        self.assertIn("by_barangay", summary)


# ---------------------------------------------------------------------------
# 6. Public Dashboard Tests
# ---------------------------------------------------------------------------

class PublicDashboardTest(ReportsTestCaseBase):
    """Test the public dashboard (no authentication required)."""

    def test_public_dashboard_no_auth(self):
        self.client = APIClient()
        res = self.client.get("/api/v1/reports/public/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_public_dashboard_structure(self):
        self.client = APIClient()
        res = self.client.get("/api/v1/reports/public/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("program_name", res.data)
        self.assertIn("animals", res.data)
        self.assertIn("beneficiaries", res.data)
        self.assertIn("transfers", res.data)
        self.assertIn("species_breakdown", res.data)

    def test_public_dashboard_no_pii(self):
        """Public dashboard should NOT expose individual beneficiary data."""
        self.client = APIClient()
        res = self.client.get("/api/v1/reports/public/dashboard/")
        content = str(res.data)
        self.assertNotIn("Juan", content)
        self.assertNotIn("Dela Cruz", content)
        self.assertNotIn("0917", content)

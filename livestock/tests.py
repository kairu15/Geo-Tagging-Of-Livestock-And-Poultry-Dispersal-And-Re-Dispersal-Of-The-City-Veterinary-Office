"""
Tests for livestock app — Species, Breed, Animal, HealthRecord, Offspring models,
tag generation, API permissions, and public endpoints.

Covers:
1. Model constraints (Species unique, Breed unique_together, Animal tag_id generation)
2. Animal tag_id auto-generation and uniqueness
3. Permission boundaries per role
4. API endpoints: animals, species, breeds, health-records, public QR, offspring
"""
from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.db.utils import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Barangay, Beneficiary
from .models import Species, Breed, Animal, HealthRecord, Offspring

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class LivestockTestCaseBase(TestCase):
    """Shared fixtures."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="admin", password="testpass123", role="ADMIN"
        )
        cls.officer = User.objects.create_user(
            username="officer", password="testpass123", role="OFFICER"
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
        cls.beneficiary = Beneficiary.objects.create(
            first_name="Juan", last_name="Dela Cruz",
            barangay=cls.barangay,
            latitude=Decimal("9.650000"), longitude=Decimal("122.800000"),
        )

        cls.goat = Species.objects.create(name="Goat", category="LIVESTOCK")
        cls.chicken = Species.objects.create(name="Chicken", category="POULTRY")
        cls.boer = Breed.objects.create(species=cls.goat, name="Boer")
        cls.native_chicken = Breed.objects.create(species=cls.chicken, name="Native")

        cls.animal_goat = Animal.objects.create(
            species=cls.goat, breed=cls.boer, sex="FEMALE",
        )
        cls.animal_chicken = Animal.objects.create(
            species=cls.chicken, breed=cls.native_chicken,
            sex="FEMALE", is_batch=True, batch_quantity=50,
        )


# ---------------------------------------------------------------------------
# 1. Model Tests
# ---------------------------------------------------------------------------

class SpeciesModelTest(TestCase):
    def test_create_species(self):
        sp = Species.objects.create(name="Swine", category="LIVESTOCK")
        self.assertEqual(str(sp), "Swine")

    def test_unique_name(self):
        Species.objects.create(name="Goat")
        with self.assertRaises(IntegrityError):
            Species.objects.create(name="Goat")


class BreedModelTest(LivestockTestCaseBase):
    def test_str_representation(self):
        self.assertEqual(str(self.boer), "Boer (Goat)")

    def test_unique_together(self):
        Breed.objects.create(species=self.goat, name="Saanen")
        with self.assertRaises(IntegrityError):
            Breed.objects.create(species=self.goat, name="Saanen")

    def test_same_name_different_species_allowed(self):
        breed = Breed.objects.create(species=self.chicken, name="Boer")
        self.assertIsNotNone(breed.pk)


class AnimalModelTest(LivestockTestCaseBase):
    """Test Animal model, tag_id generation, and constraints."""

    def test_tag_id_auto_generated(self):
        self.assertIsNotNone(self.animal_goat.tag_id)
        self.assertTrue(self.animal_goat.tag_id.startswith("CVO-GOAT-"))

    def test_tag_id_unique(self):
        self.assertNotEqual(self.animal_goat.tag_id, self.animal_chicken.tag_id)

    def test_batch_animal(self):
        self.assertTrue(self.animal_chicken.is_batch)
        self.assertEqual(self.animal_chicken.batch_quantity, 50)

    def test_single_animal_default_batch(self):
        self.assertFalse(self.animal_goat.is_batch)
        self.assertEqual(self.animal_goat.batch_quantity, 1)

    def test_default_status_is_available(self):
        a = Animal.objects.create(species=self.goat, sex="MALE")
        self.assertEqual(a.current_status, "AVAILABLE")

    def test_str_representation(self):
        s = str(self.animal_chicken)
        self.assertIn(self.animal_chicken.tag_id, s)
        self.assertIn("Chicken", s)
        self.assertIn("batch of 50", s)

    def test_sequential_tag_ids(self):
        """Tag IDs should increment per species."""
        a1 = Animal.objects.create(species=self.goat, sex="MALE")
        a2 = Animal.objects.create(species=self.goat, sex="FEMALE")
        seq1 = int(a1.tag_id.split("-")[-1])
        seq2 = int(a2.tag_id.split("-")[-1])
        self.assertEqual(seq2, seq1 + 1)


class HealthRecordModelTest(LivestockTestCaseBase):
    def test_create_vaccination_record(self):
        rec = HealthRecord.objects.create(
            animal=self.animal_goat,
            record_type="VACCINATION",
            date=date.today(),
            veterinarian=self.officer,
            notes="Annual vaccination",
        )
        self.assertIn("Vaccination", str(rec))
        self.assertIn(self.animal_goat.tag_id, str(rec))

    def test_ordering_by_date(self):
        HealthRecord.objects.create(
            animal=self.animal_goat, record_type="VACCINATION", date=date(2026, 1, 1)
        )
        HealthRecord.objects.create(
            animal=self.animal_goat, record_type="DEWORMING", date=date(2026, 6, 1)
        )
        records = list(HealthRecord.objects.filter(animal=self.animal_goat))
        self.assertEqual(records[0].record_type, "DEWORMING")
        self.assertEqual(records[1].record_type, "VACCINATION")


class OffspringModelTest(LivestockTestCaseBase):
    def test_create_offspring(self):
        child = Animal.objects.create(species=self.goat, sex="FEMALE")
        offspring = Offspring.objects.create(
            dam=self.animal_goat,
            child=child,
            child_tag_id=child.tag_id,
            birth_date=date.today(),
            litter_size=2,
        )
        self.assertEqual(offspring.status, "BORN")
        self.assertEqual(offspring.litter_size, 2)

    def test_str_representation(self):
        offspring = Offspring.objects.create(
            dam=self.animal_goat,
            child_tag_id="CVO-GOAT-2026-999999",
            birth_date=date(2026, 3, 15),
        )
        s = str(offspring)
        self.assertIn(self.animal_goat.tag_id, s)
        self.assertIn("2026-03-15", s)


# ---------------------------------------------------------------------------
# 2. Permission Tests
# ---------------------------------------------------------------------------

class LivestockPermissionTest(LivestockTestCaseBase):
    def setUp(self):
        self.client = APIClient()

    def test_officer_can_create_animal(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/animals/", {
            "species": self.goat.id,
            "sex": "MALE",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_create_animal(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post("/api/v1/animals/", {
            "species": self.goat.id,
            "sex": "MALE",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinator_can_view_animals(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/animals/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_view_animals(self):
        res = self.client.get("/api/v1/animals/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_officer_can_create_health_record(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/health-records/", {
            "animal": self.animal_goat.id,
            "record_type": "VACCINATION",
            "date": str(date.today()),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_create_health_record(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post("/api/v1/health-records/", {
            "animal": self.animal_goat.id,
            "record_type": "VACCINATION",
            "date": str(date.today()),
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# 3. API Endpoint Tests
# ---------------------------------------------------------------------------

class AnimalAPITest(LivestockTestCaseBase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_list_animals(self):
        res = self.client.get("/api/v1/animals/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_filter_by_species(self):
        res = self.client.get(f"/api/v1/animals/?species={self.goat.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        for a in results:
            self.assertEqual(a["species"], self.goat.id)

    def test_filter_by_status(self):
        res = self.client.get("/api/v1/animals/?current_status=AVAILABLE")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_retrieve_animal(self):
        res = self.client.get(f"/api/v1/animals/{self.animal_goat.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["tag_id"], self.animal_goat.tag_id)

    def test_animal_history(self):
        res = self.client.get(f"/api/v1/animals/{self.animal_goat.id}/history/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)


class PublicQRTest(LivestockTestCaseBase):
    """Test the public QR code endpoint (no auth required)."""

    def test_public_qr_success(self):
        self.client = APIClient()
        res = self.client.get(
            f"/api/v1/public/qr/{self.animal_goat.tag_id}/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["tag_id"], self.animal_goat.tag_id)
        self.assertEqual(res.data["species"], "Goat")
        # Should NOT expose beneficiary PII
        self.assertNotIn("beneficiary_name", res.data)
        self.assertNotIn("latitude", res.data)

    def test_public_qr_not_found(self):
        self.client = APIClient()
        res = self.client.get("/api/v1/public/qr/CVO-NONEXISTENT-999999/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_qr_batch_info(self):
        self.client = APIClient()
        res = self.client.get(
            f"/api/v1/public/qr/{self.animal_chicken.tag_id}/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_batch"])
        self.assertEqual(res.data["batch_quantity"], 50)


class SpeciesBreedAPITest(LivestockTestCaseBase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_list_species(self):
        res = self.client.get("/api/v1/species/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_list_breeds(self):
        res = self.client.get("/api/v1/breeds/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_filter_breeds_by_species(self):
        res = self.client.get(f"/api/v1/breeds/?species={self.goat.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        for b in results:
            self.assertEqual(b["species"], self.goat.id)

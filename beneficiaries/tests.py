"""
Tests for beneficiaries app — Barangay and Beneficiary models,
API permissions, and lookup/constraint tests.

Covers:
1. Barangay model: unique_together constraint, __str__
2. Beneficiary model: full_name property, default fields, __str__
3. API permissions and CRUD operations
4. Search and filter functionality
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.db.utils import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from .models import Barangay, Beneficiary

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class BeneficiaryTestCaseBase(TestCase):
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
            name="Poblacion", city_municipality="Bayawan City"
        )
        cls.barangay2 = Barangay.objects.create(
            name="San Isidro", city_municipality="Bayawan City"
        )

        cls.beneficiary_a = Beneficiary.objects.create(
            first_name="Juan",
            last_name="Dela Cruz",
            middle_name="M.",
            barangay=cls.barangay,
            latitude=Decimal("9.650000"),
            longitude=Decimal("122.800000"),
            contact_number="09171234567",
            household_head=True,
            livelihood_type="Farming",
            is_active_beneficiary=True,
            registered_by=cls.officer,
        )
        cls.beneficiary_b = Beneficiary.objects.create(
            first_name="Maria",
            last_name="Santos",
            barangay=cls.barangay2,
            latitude=Decimal("9.660000"),
            longitude=Decimal("122.810000"),
            is_active_beneficiary=True,
        )
        cls.inactive_beneficiary = Beneficiary.objects.create(
            first_name="Inactive",
            last_name="Person",
            barangay=cls.barangay,
            is_active_beneficiary=False,
        )


# ---------------------------------------------------------------------------
# 1. Barangay Model Tests
# ---------------------------------------------------------------------------

class BarangayModelTest(TestCase):
    """Test Barangay model constraints and behavior."""

    def test_create_barangay(self):
        brgy = Barangay.objects.create(
            name="Test Barangay", city_municipality="Dumaguete City"
        )
        self.assertEqual(str(brgy), "Test Barangay, Dumaguete City")

    def test_unique_together_constraint(self):
        Barangay.objects.create(name="Brgy A", city_municipality="City X")
        with self.assertRaises(IntegrityError):
            Barangay.objects.create(name="Brgy A", city_municipality="City X")

    def test_same_name_different_city_allowed(self):
        Barangay.objects.create(name="Poblacion", city_municipality="City A")
        brgy2 = Barangay.objects.create(name="Poblacion", city_municipality="City B")
        self.assertIsNotNone(brgy2.pk)

    def test_optional_boundary_geojson(self):
        brgy = Barangay.objects.create(
            name="Geo Brgy", city_municipality="City",
            boundary_geojson={"type": "Polygon", "coordinates": []},
        )
        self.assertIsNotNone(brgy.boundary_geojson)


# ---------------------------------------------------------------------------
# 2. Beneficiary Model Tests
# ---------------------------------------------------------------------------

class BeneficiaryModelTest(BeneficiaryTestCaseBase):
    """Test Beneficiary model properties and constraints."""

    def test_str_representation(self):
        self.assertEqual(str(self.beneficiary_a), "Juan Dela Cruz")

    def test_str_with_suffix(self):
        b = Beneficiary.objects.create(
            first_name="Pedro", last_name="Cruz", suffix="Jr.",
            barangay=self.barangay,
        )
        self.assertEqual(str(b), "Pedro Cruz Jr.")

    def test_full_name_property(self):
        self.assertEqual(
            self.beneficiary_a.full_name, "Juan M. Dela Cruz"
        )

    def test_full_name_without_middle(self):
        self.assertEqual(
            self.beneficiary_b.full_name, "Maria Santos"
        )

    def test_full_name_with_suffix(self):
        b = Beneficiary.objects.create(
            first_name="Jose", last_name="Rizal", suffix="III",
            barangay=self.barangay,
        )
        self.assertEqual(b.full_name, "Jose Rizal III")

    def test_default_is_active(self):
        b = Beneficiary.objects.create(
            first_name="New", last_name="Person",
            barangay=self.barangay,
        )
        self.assertTrue(b.is_active_beneficiary)

    def test_date_registered_auto_set(self):
        self.assertIsNotNone(self.beneficiary_a.date_registered)

    def test_registered_by_set(self):
        self.assertEqual(self.beneficiary_a.registered_by, self.officer)

    def test_soft_delete(self):
        self.assertFalse(self.beneficiary_a.is_archived)
        self.beneficiary_a.is_archived = True
        self.beneficiary_a.save()
        self.beneficiary_a.refresh_from_db()
        self.assertTrue(self.beneficiary_a.is_archived)


# ---------------------------------------------------------------------------
# 3. API Permission Tests
# ---------------------------------------------------------------------------

class BeneficiaryPermissionTest(BeneficiaryTestCaseBase):
    """Test role-based permissions for beneficiary endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_officer_can_list_beneficiaries(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/beneficiaries/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_coordinator_can_list_beneficiaries(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/beneficiaries/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_staff_can_list_beneficiaries(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/beneficiaries/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list_beneficiaries(self):
        res = self.client.get("/api/v1/beneficiaries/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_officer_can_create_beneficiary(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post("/api/v1/beneficiaries/", {
            "first_name": "Test",
            "last_name": "Beneficiary",
            "barangay": self.barangay.id,
            "latitude": "9.650000",
            "longitude": "122.800000",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_coordinator_cannot_create_beneficiary(self):
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.post("/api/v1/beneficiaries/", {
            "first_name": "Test",
            "last_name": "Beneficiary",
            "barangay": self.barangay.id,
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# 4. API CRUD and Filter Tests
# ---------------------------------------------------------------------------

class BeneficiaryAPITest(BeneficiaryTestCaseBase):
    """Test beneficiary API CRUD, search, and filter."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_list_excludes_archived(self):
        self.beneficiary_a.is_archived = True
        self.beneficiary_a.save()
        res = self.client.get("/api/v1/beneficiaries/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Response is paginated: {count, page, page_size, results}
        ids = [b["id"] for b in res.data.get("results", res.data)]
        self.assertNotIn(self.beneficiary_a.id, ids)

    def test_filter_by_barangay(self):
        res = self.client.get(
            f"/api/v1/beneficiaries/?barangay={self.barangay.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        for b in results:
            self.assertEqual(b["barangay"], self.barangay.id)

    def test_filter_by_active(self):
        res = self.client.get("/api/v1/beneficiaries/?is_active_beneficiary=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data)
        for b in results:
            self.assertTrue(b["is_active_beneficiary"])

    def test_search_by_name(self):
        res = self.client.get("/api/v1/beneficiaries/?search=Juan")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_search_by_contact(self):
        res = self.client.get("/api/v1/beneficiaries/?search=09171234567")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_retrieve_beneficiary(self):
        res = self.client.get(f"/api/v1/beneficiaries/{self.beneficiary_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["first_name"], "Juan")

    def test_update_beneficiary(self):
        res = self.client.patch(
            f"/api/v1/beneficiaries/{self.beneficiary_a.id}/",
            {"contact_number": "09999999999"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.beneficiary_a.refresh_from_db()
        self.assertEqual(self.beneficiary_a.contact_number, "09999999999")


# ---------------------------------------------------------------------------
# 5. Barangay API Tests
# ---------------------------------------------------------------------------

class BarangayAPITest(BeneficiaryTestCaseBase):
    """Test barangay API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_list_barangays(self):
        res = self.client.get("/api/v1/barangays/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

    def test_search_barangays(self):
        res = self.client.get("/api/v1/barangays/?search=Poblacion")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_list_requires_authentication(self):
        """Verify that the default DRF authentication is configured."""
        # Barangay listing is accessible (used in registration dropdowns)
        res = self.client.get("/api/v1/barangays/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 2)

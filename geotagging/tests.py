"""
Tests for geotagging app — tag creation, custodianship, check-ins, GPS accuracy.
"""
from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Beneficiary, Barangay
from livestock.models import Animal, Species, Breed
from .models import GeoTag, Caretaker, Custodianship, LocationCheckIn, HandoffReason
from .services import (
    tag_animal,
    record_location_checkin,
    handoff_custodianship,
    retire_tag,
    TagAlreadyExistsError,
    NoActiveCustodianshipError,
    TagRetiredError,
    GPS_ACCURACY_THRESHOLD_METERS,
)

User = get_user_model()


class GeoTaggingTestCaseBase(TestCase):
    """Shared fixtures."""

    @classmethod
    def setUpTestData(cls):
        cls.officer = User.objects.create_user(
            username="officer", password="testpass123", role="OFFICER"
        )
        cls.supervisor = User.objects.create_user(
            username="supervisor", password="testpass123", role="SUPERVISOR"
        )

        cls.species = Species.objects.create(name="Goat", category="LIVESTOCK")
        cls.breed = Breed.objects.create(species=cls.species, name="Boer")

        cls.barangay = Barangay.objects.create(
            name="Barangay 1", city_municipality="Bayawan"
        )

        cls.beneficiary = Beneficiary.objects.create(
            first_name="Juan",
            last_name="Dela Cruz",
            barangay=cls.barangay,
            latitude=Decimal("9.650000"),
            longitude=Decimal("122.800000"),
        )

        cls.animal = Animal.objects.create(
            species=cls.species,
            breed=cls.breed,
            sex="FEMALE",
            current_status="AVAILABLE",
        )

        cls.caretaker = Caretaker.objects.create(
            full_name="Juan Dela Cruz",
            beneficiary=cls.beneficiary,
            barangay=cls.barangay,
            caretaker_type="FORMAL_BENEFICIARY",
            default_latitude=Decimal("9.650000"),
            default_longitude=Decimal("122.800000"),
        )

        cls.handoff_reason = HandoffReason.objects.create(
            name="Formal Re-dispersal"
        )


class TagCreationTest(GeoTaggingTestCaseBase):

    def test_tag_animal_creates_geo_tag_and_custodianship(self):
        geo_tag, cust = tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )
        self.assertIsNotNone(geo_tag.tag_code)
        self.assertTrue(geo_tag.is_active)
        self.assertEqual(cust.status, "ACTIVE")
        self.assertEqual(cust.caretaker, self.caretaker)

    def test_cannot_tag_same_animal_twice(self):
        tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )
        with self.assertRaises(TagAlreadyExistsError):
            tag_animal(
                animal=self.animal,
                tag_type="QR_ONLY",
                tagged_by=self.officer,
                initial_caretaker=self.caretaker,
                coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
            )

    def test_unique_active_custodianship_constraint(self):
        """Only one ACTIVE custodianship per GeoTag."""
        geo_tag, cust = tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )
        from django.db.utils import IntegrityError
        with self.assertRaises(IntegrityError):
            from django.db import transaction
            with transaction.atomic():
                Custodianship.objects.create(
                    geo_tag=geo_tag,
                    caretaker=self.caretaker,
                    start_date=timezone.now().date(),
                    status="ACTIVE",
                )


class HandoffTest(GeoTaggingTestCaseBase):

    def setUp(self):
        self.geo_tag, self.cust = tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )
        self.new_caretaker = Caretaker.objects.create(
            full_name="Maria Santos",
            barangay=self.barangay,
            caretaker_type="INFORMAL_CARETAKER",
        )

    def test_handoff_closes_old_opens_new(self):
        new_cust = handoff_custodianship(
            geo_tag=self.geo_tag,
            new_caretaker=self.new_caretaker,
            end_reason=self.handoff_reason,
            coordinates={"latitude": Decimal("9.66"), "longitude": Decimal("122.81")},
            exit_condition="HEALTHY",
            intake_condition="HEALTHY",
        )

        self.cust.refresh_from_db()
        self.assertEqual(self.cust.status, "CLOSED")
        self.assertIsNotNone(self.cust.end_date)
        self.assertEqual(new_cust.status, "ACTIVE")
        self.assertEqual(new_cust.caretaker, self.new_caretaker)

    def test_handoff_retired_tag_raises(self):
        retire_tag(self.geo_tag, reason=self.handoff_reason)
        with self.assertRaises(TagRetiredError):
            handoff_custodianship(
                geo_tag=self.geo_tag,
                new_caretaker=self.new_caretaker,
                end_reason=self.handoff_reason,
                coordinates={"latitude": Decimal("9.66"), "longitude": Decimal("122.81")},
                exit_condition="HEALTHY",
                intake_condition="HEALTHY",
            )


class CheckInTest(GeoTaggingTestCaseBase):

    def setUp(self):
        self.geo_tag, self.cust = tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )

    def test_checkin_creates_record(self):
        checkin = record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="FIELD_VISIT",
        )
        self.assertIsNotNone(checkin.checked_in_at)
        self.assertFalse(checkin.needs_review)

    def test_checkin_updates_geo_tag_timestamp(self):
        record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="FIELD_VISIT",
        )
        self.geo_tag.refresh_from_db()
        self.assertIsNotNone(self.geo_tag.last_checkin)

    def test_checkin_on_closed_custodianship_raises(self):
        self.cust.status = "CLOSED"
        self.cust.end_date = timezone.now().date()
        self.cust.save(update_fields=["status", "end_date"])
        with self.assertRaises(NoActiveCustodianshipError):
            record_location_checkin(
                custodianship=self.cust,
                coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
                checked_in_by=self.officer,
                source="FIELD_VISIT",
            )


class GPSAccuracyFlaggingTest(GeoTaggingTestCaseBase):
    """Test auto-flagging of low-confidence GPS check-ins."""

    def setUp(self):
        self.geo_tag, self.cust = tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )

    def test_accurate_checkin_not_flagged(self):
        checkin = record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="FIELD_VISIT",
            gps_accuracy_meters=Decimal("10"),
        )
        self.assertFalse(checkin.needs_review)
        self.assertEqual(checkin.gps_accuracy_meters, Decimal("10"))

    def test_inaccurate_checkin_auto_flagged(self):
        checkin = record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="FIELD_VISIT",
            gps_accuracy_meters=Decimal("150"),
        )
        self.assertTrue(checkin.needs_review)
        self.assertIn("150", checkin.review_reason)
        self.assertIn("threshold", checkin.review_reason)

    def test_no_accuracy_not_flagged(self):
        checkin = record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="FIELD_VISIT",
        )
        self.assertFalse(checkin.needs_review)

    def test_gps_metadata_stored(self):
        checkin = record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="GPS_DEVICE",
            gps_accuracy_meters=Decimal("5.5"),
            gps_altitude_meters=Decimal("120.3"),
            gps_speed_mps=Decimal("1.2"),
        )
        self.assertEqual(checkin.gps_accuracy_meters, Decimal("5.5"))
        self.assertEqual(checkin.gps_altitude_meters, Decimal("120.3"))
        self.assertEqual(checkin.gps_speed_mps, Decimal("1.2"))

    def test_threshold_is_configurable_value(self):
        """Verify the threshold constant is defined and reasonable."""
        self.assertIsInstance(GPS_ACCURACY_THRESHOLD_METERS, int)
        self.assertGreater(GPS_ACCURACY_THRESHOLD_METERS, 0)


class CheckInReviewAPITest(GeoTaggingTestCaseBase):
    """Test the check-in review endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.geo_tag, self.cust = tag_animal(
            animal=self.animal,
            tag_type="EAR_TAG",
            tagged_by=self.officer,
            initial_caretaker=self.caretaker,
            coordinates={"latitude": Decimal("9.65"), "longitude": Decimal("122.80")},
        )
        self.flagged_checkin = record_location_checkin(
            custodianship=self.cust,
            coordinates={"latitude": Decimal("9.651"), "longitude": Decimal("122.801")},
            checked_in_by=self.officer,
            source="FIELD_VISIT",
            gps_accuracy_meters=Decimal("200"),
        )

    def test_approve_checkin_clears_flag(self):
        self.client.force_authenticate(user=self.supervisor)
        res = self.client.post(
            f"/api/v1/geotagging/checkins/{self.flagged_checkin.id}/review/",
            {"action": "approve"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.flagged_checkin.refresh_from_db()
        self.assertFalse(self.flagged_checkin.needs_review)
        self.assertIsNotNone(self.flagged_checkin.reviewed_by)

    def test_flag_checkin_keeps_flag(self):
        self.client.force_authenticate(user=self.supervisor)
        res = self.client.post(
            f"/api/v1/geotagging/checkins/{self.flagged_checkin.id}/review/",
            {"action": "flag", "notes": "Location looks wrong"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.flagged_checkin.refresh_from_db()
        self.assertTrue(self.flagged_checkin.needs_review)
        self.assertIn("Location looks wrong", self.flagged_checkin.review_reason)

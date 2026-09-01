"""
Tests for notifications app — notification scoping, CRUD, and permissions.

Covers:
1. Notification model and helpers (create_notification, create_notifications_for_role)
2. Scoping: a user must NOT see another user's notifications
3. API endpoints: list, unread_count, mark_read, mark_all_read, archive, delete
4. Permission boundaries per role
"""
from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Barangay, Beneficiary
from livestock.models import Animal, Species, Breed
from dispersal.models import OwnershipRecord, TransferReason
from .models import Notification, create_notification, create_notifications_for_role

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class NotificationTestCaseBase(TestCase):
    """Shared fixtures for notification tests."""

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

        cls.species = Species.objects.create(name="Goat", category="LIVESTOCK")
        cls.breed = Breed.objects.create(species=cls.species, name="Boer")
        cls.animal = Animal.objects.create(
            species=cls.species, breed=cls.breed, sex="FEMALE"
        )

        cls.beneficiary = Beneficiary.objects.create(
            first_name="Juan", last_name="Dela Cruz",
            barangay=cls.barangay,
            latitude=Decimal("9.650000"), longitude=Decimal("122.800000"),
        )

        cls.reason = TransferReason.objects.create(name="Non-compliance")

        # Create some notifications for the officer
        cls.notif_1 = Notification.objects.create(
            recipient=cls.officer,
            notification_type="DISPERSAL_REQUEST",
            title="New dispersal request",
            message="Animal %s has been requested." % cls.animal.tag_id,
        )
        cls.notif_2 = Notification.objects.create(
            recipient=cls.officer,
            notification_type="QUARANTINE",
            title="Quarantine zone active",
            message="Barangay 1 is under quarantine.",
        )
        # A notification for the coordinator (different recipient)
        cls.notif_3 = Notification.objects.create(
            recipient=cls.coordinator,
            notification_type="SYSTEM",
            title="System update",
            message="System maintenance scheduled.",
        )


# ---------------------------------------------------------------------------
# 1. Notification Model Tests
# ---------------------------------------------------------------------------

class NotificationModelTest(NotificationTestCaseBase):
    """Test model properties and helper functions."""

    def test_str_representation(self):
        self.assertIn("DISPERSAL_REQUEST", str(self.notif_1))
        self.assertIn("New dispersal request", str(self.notif_1))

    def test_get_absolute_url_health_event(self):
        from health.models import DiseaseType, HealthEvent

        disease = DiseaseType.objects.create(name="ASF")
        event = HealthEvent.objects.create(
            animal=self.animal,
            event_type="DISEASE_SUSPECT",
            disease_suspected=disease,
            event_date=date.today(),
            reported_by=self.officer,
        )
        n = Notification.objects.create(
            recipient=self.officer,
            notification_type="DISEASE_REPORT",
            title="ASF reported",
            message="Suspected ASF in goat",
            related_health_event=event,
        )
        self.assertEqual(n.get_absolute_url(), "/health/report")

    def test_get_absolute_url_quarantine_zone(self):
        from health.models import DiseaseType, QuarantineZone

        disease = DiseaseType.objects.create(name="FMD")
        zone = QuarantineZone.objects.create(
            name="Zone 1",
            barangay=self.barangay,
            disease_type=disease,
            start_date=date.today(),
            is_active=True,
            is_blocking=True,
        )
        n = Notification.objects.create(
            recipient=self.officer,
            notification_type="QUARANTINE",
            title="Zone created",
            message="New quarantine zone",
            related_quarantine_zone=zone,
        )
        self.assertEqual(n.get_absolute_url(), "/reports")

    def test_get_absolute_url_ownership_record(self):
        record = OwnershipRecord.objects.create(
            animal=self.animal,
            beneficiary=self.beneficiary,
            transfer_type="INITIAL_DISPERSAL",
            start_date=date.today(),
        )
        n = Notification.objects.create(
            recipient=self.officer,
            notification_type="DISPERSAL_APPROVED",
            title="Approved",
            message="Dispersal approved",
            related_ownership_record=record,
        )
        self.assertEqual(n.get_absolute_url(), "/dispersal")

    def test_get_absolute_url_no_related_object(self):
        self.assertEqual(self.notif_1.get_absolute_url(), "/")

    def test_create_notification_helper(self):
        n = create_notification(
            recipient=self.admin,
            notification_type="SYSTEM",
            title="Test",
            message="Test message",
        )
        self.assertEqual(n.recipient, self.admin)
        self.assertEqual(n.title, "Test")
        self.assertFalse(n.is_read)

    def test_create_notifications_for_role(self):
        notifications = create_notifications_for_role(
            role="OFFICER",
            notification_type="SYSTEM",
            title="Bulk notification",
            message="All officers",
        )
        # Should create 1 notification (one officer)
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0].recipient, self.officer)

    def test_create_notifications_for_role_with_barangay(self):
        # Assign coordinator to a barangay
        self.coordinator.assigned_barangay = self.barangay
        self.coordinator.save()

        notifications = create_notifications_for_role(
            role="COORDINATOR",
            notification_type="QUARANTINE",
            title="Barangay quarantine",
            message="Barangay is quarantined",
            barangay=self.barangay,
        )
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0].recipient, self.coordinator)

    def test_create_notifications_for_role_empty(self):
        """No users of a given role → no notifications created."""
        notifications = create_notifications_for_role(
            role="SUPERVISOR",
            notification_type="SYSTEM",
            title="Test",
            message="No supervisors",
        )
        self.assertEqual(len(notifications), 0)


# ---------------------------------------------------------------------------
# 2. Notification Scoping Tests
# ---------------------------------------------------------------------------

class NotificationScopingTest(NotificationTestCaseBase):
    """Ensure users cannot see other users' notifications."""

    def test_officer_sees_only_own_notifications(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)  # notif_1 and notif_2

    def test_coordinator_sees_only_own_notifications(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)  # notif_3 only

    def test_admin_sees_only_own_notifications(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)  # admin has none

    def test_mark_read_others_notification_returns_404(self):
        """Officer cannot mark coordinator's notification as read."""
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)
        res = self.client.post(f"/api/v1/notifications/{self.notif_3.id}/read/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_archive_others_notification_returns_404(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)
        res = self.client.post(f"/api/v1/notifications/{self.notif_3.id}/archive/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_others_notification_returns_404(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)
        res = self.client.delete(f"/api/v1/notifications/{self.notif_3.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# 3. API Endpoint Tests
# ---------------------------------------------------------------------------

class NotificationAPITest(NotificationTestCaseBase):
    """Test notification API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.officer)

    def test_list_notifications(self):
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

    def test_list_filter_by_read(self):
        self.notif_1.is_read = True
        self.notif_1.save()
        res = self.client.get("/api/v1/notifications/?read=true")
        self.assertEqual(res.data["count"], 1)
        res = self.client.get("/api/v1/notifications/?read=false")
        self.assertEqual(res.data["count"], 1)

    def test_list_filter_by_type(self):
        res = self.client.get("/api/v1/notifications/?type=QUARANTINE")
        self.assertEqual(res.data["count"], 1)
        res = self.client.get("/api/v1/notifications/?type=SYSTEM")
        self.assertEqual(res.data["count"], 0)

    def test_unread_count(self):
        self.notif_1.is_read = True
        self.notif_1.save()
        res = self.client.get("/api/v1/notifications/unread_count/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["unread_count"], 1)

    def test_mark_read(self):
        res = self.client.post(f"/api/v1/notifications/{self.notif_1.id}/read/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.notif_1.refresh_from_db()
        self.assertTrue(self.notif_1.is_read)

    def test_mark_read_nonexistent(self):
        res = self.client.post("/api/v1/notifications/99999/read/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read(self):
        res = self.client.post("/api/v1/notifications/read_all/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["marked_read"], 2)
        self.officer.refresh_from_db()
        self.assertFalse(self.notif_1.is_read)  # need to refresh from db
        self.notif_1.refresh_from_db()
        self.notif_2.refresh_from_db()
        self.assertTrue(self.notif_1.is_read)
        self.assertTrue(self.notif_2.is_read)

    def test_archive(self):
        res = self.client.post(f"/api/v1/notifications/{self.notif_1.id}/archive/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.notif_1.refresh_from_db()
        self.assertTrue(self.notif_1.is_archived)

    def test_delete_notification(self):
        res = self.client.delete(f"/api/v1/notifications/{self.notif_1.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(pk=self.notif_1.id).exists())

    def test_archived_notifications_excluded_from_list(self):
        self.notif_1.is_archived = True
        self.notif_1.save()
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.data["count"], 1)


# ---------------------------------------------------------------------------
# 4. Permission Tests
# ---------------------------------------------------------------------------

class NotificationPermissionTest(NotificationTestCaseBase):
    """Test that unauthenticated users are blocked."""

    def test_unauthenticated_list_returns_401(self):
        self.client = APIClient()
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_unread_count_returns_401(self):
        self.client = APIClient()
        res = self.client.get("/api/v1/notifications/unread_count/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_can_access_notifications(self):
        """Staff (read-only role) should be able to view their own notifications."""
        self.client = APIClient()
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_coordinator_can_access_notifications(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

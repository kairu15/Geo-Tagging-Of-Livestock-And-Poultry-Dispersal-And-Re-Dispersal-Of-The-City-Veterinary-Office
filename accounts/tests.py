"""
Tests for accounts app — user roles, permissions, and auth endpoints.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from beneficiaries.models import Barangay

User = get_user_model()


class UserRoleTest(TestCase):
    """Test role properties on the User model."""

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

    def test_admin_role_properties(self):
        self.assertTrue(self.admin.is_admin)
        self.assertTrue(self.admin.is_officer_or_above)
        self.assertTrue(self.admin.is_supervisor_or_above)
        self.assertFalse(self.admin.is_staff_role)
        self.assertFalse(self.admin.is_read_only)

    def test_officer_role_properties(self):
        self.assertFalse(self.officer.is_admin)
        self.assertTrue(self.officer.is_officer_or_above)
        self.assertFalse(self.officer.is_supervisor_or_above)
        self.assertFalse(self.officer.is_staff_role)
        self.assertFalse(self.officer.is_read_only)

    def test_supervisor_role_properties(self):
        self.assertFalse(self.supervisor.is_admin)
        self.assertTrue(self.supervisor.is_officer_or_above)
        self.assertTrue(self.supervisor.is_supervisor_or_above)
        self.assertFalse(self.supervisor.is_staff_role)
        self.assertFalse(self.supervisor.is_read_only)

    def test_coordinator_role_properties(self):
        self.assertFalse(self.coordinator.is_admin)
        self.assertFalse(self.coordinator.is_officer_or_above)
        self.assertFalse(self.coordinator.is_supervisor_or_above)
        self.assertFalse(self.coordinator.is_staff_role)
        self.assertTrue(self.coordinator.is_read_only)

    def test_staff_role_properties(self):
        self.assertFalse(self.staff.is_admin)
        self.assertFalse(self.staff.is_officer_or_above)
        self.assertFalse(self.staff.is_supervisor_or_above)
        self.assertTrue(self.staff.is_staff_role)
        self.assertTrue(self.staff.is_read_only)


class LoginAPITest(TestCase):
    """Test the JWT login endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", password="testpass123", role="OFFICER"
        )

    def test_login_success(self):
        res = self.client.post("/api/v1/auth/login/", {
            "username": "testuser",
            "password": "testpass123",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertIn("user", res.data)

    def test_login_wrong_password(self):
        res = self.client.post("/api/v1/auth/login/", {
            "username": "testuser",
            "password": "wrongpassword",
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        res = self.client.post("/api/v1/auth/login/", {
            "username": "nobody",
            "password": "testpass123",
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_deactivated_account(self):
        self.user.is_active = False
        self.user.save()
        res = self.client.post("/api/v1/auth/login/", {
            "username": "testuser",
            "password": "testpass123",
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "testuser")

    def test_me_endpoint_unauthenticated(self):
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_list_admin_only(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/v1/auth/users/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_password_admin_only(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            f"/api/v1/auth/users/{self.user.id}/reset-password/",
            {"new_password": "newpass123"},
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

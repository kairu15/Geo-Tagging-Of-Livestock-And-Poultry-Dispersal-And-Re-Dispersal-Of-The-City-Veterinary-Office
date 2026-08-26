from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user model with CVO-specific role information.

    Role-based access is the backbone of permission checks throughout the system.
    Instead of boolean flags, we use a single `role` field so the permission matrix
    is clear and auditable.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "System Admin"
        OFFICER = "OFFICER", "CVO Veterinarian / Officer (Encoder)"
        SUPERVISOR = "SUPERVISOR", "CVO Supervisor"
        COORDINATOR = "COORDINATOR", "Barangay Coordinator"
        STAFF = "STAFF", "Staff (Read-Only)"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OFFICER)
    contact_number = models.CharField(max_length=20, blank=True, default="")
    assigned_barangay = models.ForeignKey(
        "beneficiaries.Barangay",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_officers",
        help_text="Barangay this officer is primarily assigned to.",
    )
    is_active_officer = models.BooleanField(
        default=True,
        help_text="False = deactivated account; still exists for audit trail.",
    )

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_officer_or_above(self):
        return self.role in (self.Role.ADMIN, self.Role.OFFICER, self.Role.SUPERVISOR)

    @property
    def is_staff_role(self):
        return self.role == self.Role.STAFF

    @property
    def is_supervisor_or_above(self):
        return self.role in (self.Role.ADMIN, self.Role.SUPERVISOR)

    @property
    def is_read_only(self):
        """True for roles that can only view data, not modify it."""
        return self.role in (self.Role.COORDINATOR, self.Role.STAFF)

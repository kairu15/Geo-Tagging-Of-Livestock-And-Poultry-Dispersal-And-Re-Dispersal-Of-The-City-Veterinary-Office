from django.db import models
from django.conf import settings
from simple_history.models import HistoricalRecords


class Notification(models.Model):
    """
    Persistent, in-app notification scoped to a single recipient.
    Targeting is handled at creation time — each notification has exactly one recipient.
    """

    class NotificationType(models.TextChoices):
        QUARANTINE = "QUARANTINE", "Quarantine Zone"
        DISEASE_REPORT = "DISEASE_REPORT", "Disease Report"
        DISPERSAL_REQUEST = "DISPERSAL_REQUEST", "Dispersal Request"
        DISPERSAL_APPROVED = "DISPERSAL_APPROVED", "Dispersal Approved"
        DISPERSAL_REJECTED = "DISPERSAL_REJECTED", "Dispersal Rejected"
        REDISPERSAL_REQUEST = "REDISPERSAL_REQUEST", "Re-Dispersal Request"
        REDISPERSAL_APPROVED = "REDISPERSAL_APPROVED", "Re-Dispersal Approved"
        REDISPERSAL_REJECTED = "REDISPERSAL_REJECTED", "Re-Dispersal Rejected"
        PASS_ON_DUE = "PASS_ON_DUE", "Pass-On Due"
        PASS_ON_OVERDUE = "PASS_ON_OVERDUE", "Pass-On Overdue"
        SYSTEM = "SYSTEM", "System"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Optional link to the related object — explicit nullable FKs rather than GFK
    # for simplicity and query performance.
    related_health_event = models.ForeignKey(
        "health.HealthEvent",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_quarantine_zone = models.ForeignKey(
        "health.QuarantineZone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_ownership_record = models.ForeignKey(
        "dispersal.OwnershipRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    related_offspring = models.ForeignKey(
        "livestock.Offspring",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(default=False, db_index=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "is_archived"]),
            models.Index(fields=["recipient", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient}"

    def get_absolute_url(self):
        """Return a frontend route the client can navigate to based on the related object."""
        if self.related_health_event_id:
            return f"/health/report"
        if self.related_quarantine_zone_id:
            return f"/reports"
        if self.related_ownership_record_id:
            return f"/dispersal"
        if self.related_offspring_id:
            return f"/reports"
        return "/"


# ---------------------------------------------------------------------------
# Helper to create notifications from service code
# ---------------------------------------------------------------------------

def create_notification(
    *,
    recipient,
    notification_type,
    title,
    message,
    related_health_event=None,
    related_quarantine_zone=None,
    related_ownership_record=None,
    related_offspring=None,
):
    """Create a single notification. Intended to be called from views / signals."""
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_health_event=related_health_event,
        related_quarantine_zone=related_quarantine_zone,
        related_ownership_record=related_ownership_record,
        related_offspring=related_offspring,
    )


def create_notifications_for_role(
    *,
    role,
    notification_type,
    title,
    message,
    barangay=None,
    **kwargs,
):
    """
    Create notifications for all active users of a given role.
    If barangay is provided, further filters to coordinators assigned to that barangay
    (via the User.barangay FK if present), or falls back to all users of that role.
    """
    from accounts.models import User

    qs = User.objects.filter(is_active=True, role=role)
    if barangay is not None:
        # Only target coordinators in the affected barangay
        qs = qs.filter(assigned_barangay=barangay)

    notifications = []
    for user in qs:
        notifications.append(
            Notification(
                recipient=user,
                notification_type=notification_type,
                title=title,
                message=message,
                **{
                    k: v
                    for k, v in kwargs.items()
                    if v is not None
                },
            )
        )
    if notifications:
        Notification.objects.bulk_create(notifications)
    return notifications

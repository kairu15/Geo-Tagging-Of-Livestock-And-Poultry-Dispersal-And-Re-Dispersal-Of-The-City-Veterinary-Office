from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import HealthEvent, QuarantineZone
from notifications.models import create_notification, create_notifications_for_role


@receiver(post_save, sender=HealthEvent)
def notify_disease_report(sender, instance, created, **kwargs):
    """When a disease-suspect HealthEvent is created, notify Supervisors and Officers."""
    if not created:
        return
    if instance.disease_suspected and instance.severity in ("HIGH", "CRITICAL"):
        create_notifications_for_role(
            role="SUPERVISOR",
            notification_type="DISEASE_REPORT",
            title=f"Disease report: {instance.animal}",
            message=(
                f"A {instance.get_severity_display().lower()} severity disease-suspect report "
                f"has been submitted for animal {instance.animal}. "
                f"Suspected disease: {instance.disease_suspected}."
            ),
            related_health_event=instance,
        )
        create_notifications_for_role(
            role="OFFICER",
            notification_type="DISEASE_REPORT",
            title=f"Disease report: {instance.animal}",
            message=(
                f"A {instance.get_severity_display().lower()} severity disease-suspect report "
                f"has been submitted for animal {instance.animal}."
            ),
            related_health_event=instance,
        )


@receiver(post_save, sender=QuarantineZone)
def notify_quarantine_change(sender, instance, created, **kwargs):
    """When a quarantine zone is created or activated, notify Coordinators and Officers."""
    if created:
        # New zone created — always notify if active
        if instance.is_active:
            _send_quarantine_notifications(instance, activated=True)
    else:
        # Existing zone updated — check if is_active changed by looking at the DB
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT is_active FROM health_quarantinezone WHERE id = %s",
                [instance.pk],
            )
            row = cursor.fetchone()
        old_is_active = row[0] if row else None
        if old_is_active is not None and old_is_active != instance.is_active:
            _send_quarantine_notifications(instance, activated=instance.is_active)


def _send_quarantine_notifications(zone, activated=True):
    """Send quarantine notifications to Coordinators and Officers for the affected barangay."""
    status_word = "activated" if activated else "deactivated"
    title = f"Quarantine zone {status_word}: {zone.name}"
    disease_name = zone.disease_type.name if zone.disease_type else "unknown disease"
    message = f"A quarantine zone ({disease_name}) has been {status_word} in {zone.barangay}."

    create_notifications_for_role(
        role="COORDINATOR",
        notification_type="QUARANTINE",
        title=title,
        message=message,
        barangay=zone.barangay,
        related_quarantine_zone=zone,
    )
    create_notifications_for_role(
        role="OFFICER",
        notification_type="QUARANTINE",
        title=title,
        message=message,
        related_quarantine_zone=zone,
    )

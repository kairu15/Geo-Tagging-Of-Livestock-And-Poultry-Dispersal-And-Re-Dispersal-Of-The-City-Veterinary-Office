"""
Disease Surveillance & Biosecurity models.

This module provides the data layer for the CVO's disease response capabilities,
connecting custody/movement data to outbreak management. It integrates with the
existing livestock, beneficiaries, and geotagging apps without modifying
the ownership/custody ledger.

Models:
- DiseaseType: Extensible lookup for diseases (ASF, Newcastle, FMD, etc.)
- HealthEvent: Records health observations, illness reports, and mortality
- QuarantineZone: Geographic containment zones linked to barangay boundaries
"""
from django.db import models
from simple_history.models import HistoricalRecords


class DiseaseType(models.Model):
    """Extensible lookup table for disease types.

    Seeded with common Philippine livestock diseases but designed to grow.
    Uses a lookup table rather than hardcoded choices per the project convention.
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class HealthEvent(models.Model):
    """A health-related event for an animal.

    Extends the existing livestock.HealthRecord concept with disease surveillance
    capabilities: suspected disease reporting, mortality tracking, and location
    capture for outbreak mapping.

    Does NOT modify the ownership/custody ledger — this is purely additive.
    """

    class EventType(models.TextChoices):
        VACCINATION = "VACCINATION", "Vaccination"
        DEWORMING = "DEWORMING", "Deworming"
        TREATMENT = "TREATMENT", "Treatment"
        INSPECTION = "INSPECTION", "Inspection"
        ILLNESS = "ILLNESS", "Illness Report"
        DISEASE_SUSPECT = "DISEASE_SUSPECT", "Disease Suspect Report"
        MORTALITY = "MORTALITY", "Mortality"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    # Core relationship
    animal = models.ForeignKey(
        "livestock.Animal",
        on_delete=models.CASCADE,
        related_name="health_events",
    )

    # Event classification
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    disease_suspected = models.ForeignKey(
        DiseaseType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_events",
        help_text="Required when event_type is DISEASE_SUSPECT.",
    )
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.LOW,
        help_text="Severity level for illness/disease-suspect events.",
    )

    # When & who
    event_date = models.DateField()
    reported_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_events_reported",
    )

    # Location (captured at time of report for outbreak mapping)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text="GPS latitude where the event was observed.",
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text="GPS longitude where the event was observed.",
    )

    # Details
    notes = models.TextField(blank=True, default="")
    photo = models.ImageField(
        upload_to="health/events/",
        blank=True, null=True,
        help_text="Photo evidence of the health event.",
    )

    # Status tracking for disease-suspect reports
    class ReportStatus(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        CONFIRMED = "CONFIRMED", "Confirmed"
        DISMISSED = "DISMISSED", "Dismissed"

    report_status = models.CharField(
        max_length=15,
        choices=ReportStatus.choices,
        default=ReportStatus.SUBMITTED,
        help_text="Status of disease-suspect reports (for review workflow).",
    )
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_events_reviewed",
    )
    review_notes = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps & soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-event_date", "-created_at"]
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["event_date"]),
            models.Index(fields=["report_status"]),
            models.Index(fields=["animal", "event_type"]),
        ]

    def __str__(self):
        disease = f" ({self.disease_suspected.name})" if self.disease_suspected else ""
        return f"{self.get_event_type_display()}{disease} — {self.animal.tag_id} — {self.event_date}"


class QuarantineZone(models.Model):
    """A geographic containment zone for disease response.

    Linked to a Barangay and optionally overrides its boundary with a custom
    GeoJSON polygon. When active, the zone is overlaid on the map and
    checked during dispersal/re-dispersal workflows.

    The `is_blocking` flag makes this configurable: some zones warn but
    allow authorized transfers, while others block all movement.
    """

    name = models.CharField(
        max_length=200,
        help_text="Descriptive name, e.g., 'Bayawan Zone 1 - ASF Response'.",
    )
    barangay = models.ForeignKey(
        "beneficiaries.Barangay",
        on_delete=models.PROTECT,
        related_name="quarantine_zones",
    )
    disease_type = models.ForeignKey(
        DiseaseType,
        on_delete=models.PROTECT,
        related_name="quarantine_zones",
    )

    # Geographic boundary (optional override of barangay boundary)
    boundary_geojson = models.JSONField(
        null=True, blank=True,
        help_text="Custom GeoJSON polygon. If null, uses the linked barangay's boundary.",
    )

    # Time range
    start_date = models.DateField()
    end_date = models.DateField(
        null=True, blank=True,
        help_text="Null = zone is open-ended (no planned end date).",
    )

    # Configuration
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive zones are historical records, not enforced.",
    )
    is_blocking = models.BooleanField(
        default=True,
        help_text="If true, dispersal/re-dispersal to/from this zone is blocked. "
                  "If false, a warning is shown but the transfer is allowed.",
    )

    # Notes
    notes = models.TextField(
        blank=True, default="",
        help_text="Additional context: reason for quarantine, DA directives, etc.",
    )

    # Admin
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quarantine_zones_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-start_date", "name"]

    def __str__(self):
        status = "ACTIVE" if self.is_active else "INACTIVE"
        return f"{self.name} ({self.disease_type.name}, {status})"

    @property
    def is_current(self):
        """Check if the zone is currently active (date range + is_active flag)."""
        from django.utils import timezone
        today = timezone.now().date()
        if not self.is_active:
            return False
        if self.end_date and today > self.end_date:
            return False
        return today >= self.start_date

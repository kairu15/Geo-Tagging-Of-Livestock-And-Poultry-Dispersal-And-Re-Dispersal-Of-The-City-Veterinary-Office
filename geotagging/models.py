from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class HandoffReason(models.Model):
    """Lookup table for custodianship hand-off reasons."""

    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Caretaker(models.Model):
    """A party who physically holds an animal — broader than Beneficiary.

    May or may not link to a formal CVO Beneficiary record. This allows
    geo-tracking for informal caretakers, temporary fosters, and CVO facilities.
    """

    class CaretakerType(models.TextChoices):
        FORMAL_BENEFICIARY = "FORMAL_BENEFICIARY", "Formal Beneficiary"
        INFORMAL_CARETAKER = "INFORMAL_CARETAKER", "Informal Caretaker"
        TEMPORARY_FOSTER = "TEMPORARY_FOSTER", "Temporary Foster"
        CVO_HOLDING_FACILITY = "CVO_HOLDING_FACILITY", "CVO Holding Facility"

    beneficiary = models.ForeignKey(
        "beneficiaries.Beneficiary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="caretaker_profiles",
        help_text="Link to formal beneficiary record when applicable.",
    )
    full_name = models.CharField(max_length=200)
    contact_number = models.CharField(max_length=20, blank=True, default="")
    barangay = models.ForeignKey(
        "beneficiaries.Barangay",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="caretakers",
    )
    address_text = models.TextField(blank=True, default="")
    caretaker_type = models.CharField(
        max_length=25, choices=CaretakerType.choices, default=CaretakerType.FORMAL_BENEFICIARY
    )
    default_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="Default location latitude.",
    )
    default_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="Default location longitude.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.get_caretaker_type_display()})"

    @property
    def display_name(self):
        return self.full_name


class GeoTag(models.Model):
    """A physical tag assigned to an animal for geo-tracking.

    OneToOne with livestock.Animal — every geo-tracked animal has exactly one active tag.
    Tags can be retired (lost, animal deceased) and replaced (linked via replacement_of).
    """

    class TagType(models.TextChoices):
        EAR_TAG = "EAR_TAG", "Ear Tag"
        LEG_BAND = "LEG_BAND", "Leg Band"
        QR_ONLY = "QR_ONLY", "QR Only"
        GPS_COLLAR = "GPS_COLLAR", "GPS Collar"

    animal = models.OneToOneField(
        "livestock.Animal",
        on_delete=models.PROTECT,
        related_name="geo_tag",
        help_text="The animal this tag is attached to.",
    )
    tag_code = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
        help_text="Unique human-readable + QR-scannable code, e.g. GT-2026-00456",
    )
    tag_type = models.CharField(max_length=15, choices=TagType.choices, default=TagType.EAR_TAG)
    date_tagged = models.DateField(auto_now_add=True)
    tagged_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tags_created",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="False if tag is retired (lost, animal deceased, etc.).",
    )
    replacement_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replacements",
        help_text="If this is a replacement tag, link to the old tag for lineage continuity.",
    )
    last_checkin = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of most recent LocationCheckIn for any custodianship under this tag.",
    )
    last_device_ping = models.DateTimeField(
        null=True, blank=True,
        help_text="Last ping from GPS device — separate from checkin to detect device failures.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tag_code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        status = "Active" if self.is_active else "Retired"
        return f"{self.tag_code} — {self.animal.tag_id} ({status})"

    def save(self, *args, **kwargs):
        if not self.tag_code:
            self.tag_code = self._generate_tag_code()
        super().save(*args, **kwargs)

    def _generate_tag_code(self):
        """Generate deterministic code like GT-2026-000456."""
        from django.utils import timezone
        year = timezone.now().year
        prefix = f"GT-{year}-"
        last = GeoTag.objects.filter(tag_code__startswith=prefix).order_by("-tag_code").first()
        if last:
            last_seq = int(last.tag_code.split("-")[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1
        return f"{prefix}{new_seq:06d}"


class Custodianship(models.Model):
    """Append-only custody ledger for geo-tagging.

    Parallel concept to dispersal.OwnershipRecord but focused on physical
    custody and geolocation. Exactly one ACTIVE record per GeoTag at any time.
    """

    class IntakeCondition(models.TextChoices):
        HEALTHY = "HEALTHY", "Healthy"
        SICK = "SICK", "Sick"
        INJURED = "INJURED", "Injured"
        UNDERWEIGHT = "UNDERWEIGHT", "Underweight"

    class ExitCondition(models.TextChoices):
        HEALTHY = "HEALTHY", "Healthy"
        SICK = "SICK", "Sick"
        INJURED = "INJURED", "Injured"
        UNDERWEIGHT = "UNDERWEIGHT", "Underweight"
        DECEASED = "DECEASED", "Deceased"

    class RecordStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"

    geo_tag = models.ForeignKey(
        GeoTag, on_delete=models.PROTECT, related_name="custodianships"
    )
    caretaker = models.ForeignKey(
        Caretaker, on_delete=models.PROTECT, related_name="custodianships"
    )
    linked_dispersal_record = models.ForeignKey(
        "dispersal.OwnershipRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="geotag_custodianships",
        help_text="Populated when hand-off was triggered by a formal dispersal/re-dispersal.",
    )

    # Start fields
    start_date = models.DateField()
    start_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    start_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    intake_condition = models.CharField(
        max_length=15,
        choices=IntakeCondition.choices,
        default=IntakeCondition.HEALTHY,
    )

    # End fields (nullable = active)
    end_date = models.DateField(null=True, blank=True)
    end_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    end_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    end_reason = models.ForeignKey(
        HandoffReason,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custodianships",
    )
    exit_condition = models.CharField(
        max_length=15,
        choices=ExitCondition.choices,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=10,
        choices=RecordStatus.choices,
        default=RecordStatus.ACTIVE,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["geo_tag"],
                condition=models.Q(status="ACTIVE"),
                name="unique_active_custodianship_per_geotag",
            ),
        ]

    def __str__(self):
        caretaker_name = self.caretaker.full_name if self.caretaker else "Unknown"
        return (
            f"{self.geo_tag.tag_code} → {caretaker_name} "
            f"({self.start_date}, {self.get_status_display()})"
        )


class LocationCheckIn(models.Model):
    """A location update within a custodianship period.

    Multiple check-ins can occur under one custodianship (e.g., quarterly visits)
    without creating new custody records. Only a caretaker change creates a new Custodianship.
    """

    class CheckInSource(models.TextChoices):
        FIELD_VISIT = "FIELD_VISIT", "Field Visit"
        MANUAL_UPDATE = "MANUAL_UPDATE", "Manual Update"
        GPS_DEVICE = "GPS_DEVICE", "GPS Device"
        CITIZEN_REPORT = "CITIZEN_REPORT", "Citizen Report"

    custodianship = models.ForeignKey(
        Custodianship, on_delete=models.CASCADE, related_name="checkins"
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    checked_in_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="geotag_checkins",
        help_text="Null if from automated GPS device.",
    )
    source = models.CharField(
        max_length=20, choices=CheckInSource.choices, default=CheckInSource.FIELD_VISIT
    )
    photo = models.ImageField(upload_to="geotagging/checkins/", blank=True, null=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-checked_in_at"]

    def __str__(self):
        return (
            f"Check-in: {self.custodianship.geo_tag.tag_code} "
            f"at ({self.latitude}, {self.longitude}) — {self.checked_in_at}"
        )

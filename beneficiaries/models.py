from django.db import models
from simple_history.models import HistoricalRecords


class Barangay(models.Model):
    """Lookup table for barangays (smallest PH administrative division).

    Used for filtering, reporting, and optionally displaying boundaries on the map.
    """

    name = models.CharField(max_length=200)
    city_municipality = models.CharField(max_length=200)
    boundary_geojson = models.JSONField(
        null=True,
        blank=True,
        help_text="Optional GeoJSON polygon for choropleth/boundary overlay on the map.",
    )

    class Meta:
        ordering = ["city_municipality", "name"]
        unique_together = ["name", "city_municipality"]

    def __str__(self):
        return f"{self.name}, {self.city_municipality}"


class Beneficiary(models.Model):
    """A person/family registered to receive and raise livestock.

    Coordinates represent the beneficiary's farm/backyard — the physical location
    where animals will be kept. These are the geo-tags used when dispersing animals.
    """

    # Identity
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, default="")
    last_name = models.CharField(max_length=100)
    suffix = models.CharField(max_length=20, blank=True, default="")

    # Contact
    contact_number = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")

    # Address
    barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, related_name="beneficiaries")
    sitio_purok = models.CharField(max_length=200, blank=True, default="")
    full_address = models.TextField(blank=True, default="")

    # ID verification
    valid_id_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="e.g., PhilSys ID, Voter's ID, Barangay Certificate",
    )
    valid_id_number = models.CharField(max_length=100, blank=True, default="")
    id_image = models.ImageField(upload_to="beneficiaries/ids/", blank=True, null=True)

    # Household info
    household_head = models.BooleanField(
        default=False,
        help_text="Is this person the household head?",
    )
    livelihood_type = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Primary livelihood: farming, livestock, fishing, etc.",
    )

    # Status
    is_active_beneficiary = models.BooleanField(
        default=True,
        help_text="Can they currently receive/hold animals? Set False for inactive.",
    )

    # Registration
    date_registered = models.DateField(auto_now_add=True)
    registered_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registered_beneficiaries",
    )

    # Philippine Data Privacy Act (RA 10173) compliance
    privacy_consent_given = models.BooleanField(
        default=False,
        help_text="Beneficiary has been informed of and consented to data collection "
                  "as required by the Philippine Data Privacy Act of 2012 (RA 10173).",
    )
    privacy_consent_date = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp when privacy consent was obtained.",
    )

    # Geo-coordinates (farm/home default)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Beneficiary's default farm/home latitude.",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Beneficiary's default farm/home longitude.",
    )

    # Soft deletion
    is_archived = models.BooleanField(default=False)

    history = HistoricalRecords()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        name = f"{self.first_name} {self.last_name}"
        if self.suffix:
            name += f" {self.suffix}"
        return name

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        if self.suffix:
            parts.append(self.suffix)
        return " ".join(p for p in parts if p)

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from simple_history.models import HistoricalRecords


class Species(models.Model):
    """Lookup: Goat, Cattle, Swine, Chicken, Duck, etc.

    Category distinguishes between livestock (individually tracked) and poultry
    (may be batch-tracked).
    """

    class Category(models.TextChoices):
        LIVESTOCK = "LIVESTOCK", "Livestock"
        POULTRY = "POULTRY", "Poultry"

    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.LIVESTOCK)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Breed(models.Model):
    """Breed within a species (e.g., "Boer" for Goat, "Native" for Chicken)."""

    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name="breeds")
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ["species", "name"]
        unique_together = ["species", "name"]

    def __str__(self):
        return f"{self.name} ({self.species.name})"


class Animal(models.Model):
    """A single animal (or batch of poultry) tracked by the CVO.

    This is the core entity. Every animal is born/acquired into the system with
    status AVAILABLE, then moves through dispersal → ownership → potential
    re-dispersal. The `current_owner` and `current_status` fields are denormalized
    for fast map/dashboard queries; the authoritative ownership history lives in
    `dispersal.OwnershipRecord`.

    `tag_id` is the animal's unique identifier — like a vehicle plate number.
    It is auto-generated per species per year for traceability.
    """

    class Sex(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available (in CVO custody)"
        DISPERSED = "DISPERSED", "Currently Dispersed"
        UNDER_RE_DISPERSAL_REVIEW = "UNDER_RE_DISPERSAL_REVIEW", "Under Re-Dispersal Review"
        RETURNED_TO_CVO = "RETURNED_TO_CVO", "Returned to CVO"
        DECEASED = "DECEASED", "Deceased"
        CULLED = "CULLED", "Culled"
        SOLD_WITH_APPROVAL = "SOLD_WITH_APPROVAL", "Sold with Approval"

    # Unique identifier — auto-generated like CVO-GOAT-2026-000123
    tag_id = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        help_text="Auto-generated unique tag: CVO-{SPECIES}-{YEAR}-{SEQ}",
    )

    # Classification
    species = models.ForeignKey(Species, on_delete=models.PROTECT, related_name="animals")
    breed = models.ForeignKey(Breed, on_delete=models.SET_NULL, null=True, blank=True, related_name="animals")

    # Physical attributes
    sex = models.CharField(max_length=6, choices=Sex.choices)
    birth_date = models.DateField(null=True, blank=True)
    estimated_age_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Used when birth date is unknown.",
    )
    color_markings = models.CharField(max_length=200, blank=True, default="")
    weight_kg = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    photo = models.ImageField(upload_to="animals/photos/", blank=True, null=True)

    # Batch support (for poultry dispersed as a lot)
    is_batch = models.BooleanField(
        default=False,
        help_text="True if this record represents a batch/lot (e.g., 50 chicks) rather than a single animal.",
    )
    batch_quantity = models.PositiveIntegerField(
        default=1,
        help_text="Number of animals in this batch. Always 1 for individually-tagged animals.",
    )
    parent_batch = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_batches",
        help_text="If this record was split from a larger batch, reference the original.",
    )

    # Current state (denormalized for fast queries)
    current_owner = models.ForeignKey(
        "beneficiaries.Beneficiary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_animals",
        help_text="Who currently holds this animal. Null = in CVO custody/not yet dispersed.",
    )
    current_status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )

    # Provenance
    date_acquired_by_cvo = models.DateField(auto_now_add=True)
    source = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Origin: DA-RFO donation, LGU-purchased, confiscated, etc.",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft deletion
    is_archived = models.BooleanField(default=False)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tag_id"]),
            models.Index(fields=["current_status"]),
            models.Index(fields=["species", "current_status"]),
        ]

    def __str__(self):
        batch_label = f" (batch of {self.batch_quantity})" if self.is_batch else ""
        return f"{self.tag_id} — {self.species.name}{batch_label}"

    def save(self, *args, **kwargs):
        if not self.tag_id:
            self.tag_id = self._generate_tag_id()
        super().save(*args, **kwargs)

    def _generate_tag_id(self):
        """Generate a deterministic tag like CVO-GOAT-2026-000123.

        Uses a per-species-per-year sequence so tags are predictable and sortable.
        """
        from django.utils import timezone

        year = timezone.now().year
        species_code = self.species.name.upper()[:6] if self.species else "UNK"
        prefix = f"CVO-{species_code}-{year}-"

        last = (
            Animal.objects.filter(tag_id__startswith=prefix)
            .order_by("-tag_id")
            .first()
        )
        if last:
            last_seq = int(last.tag_id.split("-")[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1

        return f"{prefix}{new_seq:06d}"


class HealthRecord(models.Model):
    """Health/vaccination record for an animal.

    Tracks the animal's medical history — important for disease surveillance
    and program compliance.
    """

    class RecordType(models.TextChoices):
        VACCINATION = "VACCINATION", "Vaccination"
        DEWORMING = "DEWORMING", "Deworming"
        TREATMENT = "TREATMENT", "Treatment"
        INSPECTION = "INSPECTION", "Inspection"

    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name="health_records")
    record_type = models.CharField(max_length=20, choices=RecordType.choices)
    date = models.DateField()
    veterinarian = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_records",
    )
    notes = models.TextField(blank=True, default="")
    attachment = models.FileField(upload_to="animals/health/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.get_record_type_display()} — {self.animal.tag_id} — {self.date}"

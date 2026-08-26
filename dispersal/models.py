from django.db import models


class TransferReason(models.Model):
    """Lookup table for reasons a custody period ends.

    Every OwnershipRecord closure must cite a reason — this is critical for
    audit reports (e.g., "how many animals were returned due to non-compliance?").
    """

    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OwnershipRecord(models.Model):
    """Append-only custody ledger — the heart of the chain-of-custody system.

    Each row represents one ownership period for one animal under one beneficiary.
    The FIRST record for any animal has transfer_type=INITIAL_DISPERSAL.
    Every subsequent record has transfer_type=RE_DISPERSAL.

    Design rationale:
    - We NEVER overwrite `Animal.current_owner` without first closing the old
      record and creating a new one.
    - `end_date` is NULL while the custody is active; set when the animal moves on.
    - `status` mirrors this: ACTIVE vs CLOSED.
    - Geo-coordinates are captured per-transfer so we can reconstruct the animal's
      movement path over time (polyline on the map).
    - `condition_at_transfer` records the animal's health at handover — critical
      for accountability.
    """

    class TransferType(models.TextChoices):
        INITIAL_DISPERSAL = "INITIAL_DISPERSAL", "Initial Dispersal"
        RE_DISPERSAL = "RE_DISPERSAL", "Re-Dispersal"

    class RecordStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active (current custody)"
        CLOSED = "CLOSED", "Closed"

    class ConditionAtTransfer(models.TextChoices):
        HEALTHY = "HEALTHY", "Healthy"
        SICK = "SICK", "Sick"
        INJURED = "INJURED", "Injured"
        PREGNANT = "PREGNANT", "Pregnant"
        DECEASED = "DECEASED", "Deceased"

    # Core relationships
    animal = models.ForeignKey(
        "livestock.Animal",
        on_delete=models.PROTECT,
        related_name="ownership_records",
    )
    beneficiary = models.ForeignKey(
        "beneficiaries.Beneficiary",
        on_delete=models.PROTECT,
        related_name="ownership_records",
    )

    # Transfer classification
    transfer_type = models.CharField(
        max_length=20,
        choices=TransferType.choices,
    )
    status = models.CharField(
        max_length=10,
        choices=RecordStatus.choices,
        default=RecordStatus.ACTIVE,
    )

    # Time range
    start_date = models.DateField()
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="NULL = currently active custody. Set when animal is transferred/returned.",
    )

    # Geo-tag at moment of transfer
    start_latitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text="Latitude where the animal was delivered to this beneficiary.",
    )
    start_longitude = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True,
        help_text="Longitude where the animal was delivered to this beneficiary.",
    )

    # Closure fields (populated when custody ends)
    end_reason = models.ForeignKey(
        TransferReason,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ownership_records",
    )
    end_remarks = models.TextField(
        blank=True,
        default="",
        help_text="Free-text notes about why custody ended.",
    )

    # Animal condition at handover
    condition_at_transfer = models.CharField(
        max_length=20,
        choices=ConditionAtTransfer.choices,
        default=ConditionAtTransfer.HEALTHY,
    )

    # Multiplication / "Paiwi" obligation
    offspring_count_returned = models.PositiveIntegerField(
        default=0,
        help_text="How many offspring this beneficiary returned to CVO (for pass-on obligation tracking).",
    )

    # Administrative
    processed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_dispersals",
    )
    contract_document = models.FileField(
        upload_to="dispersal/contracts/",
        blank=True,
        null=True,
        help_text="Signed dispersal agreement / MOA PDF.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]
        # Only one ACTIVE record per animal at any time.
        # Enforced via DB constraint + application-level transaction check.
        constraints = [
            models.UniqueConstraint(
                fields=["animal"],
                condition=models.Q(status="ACTIVE"),
                name="unique_active_ownership_per_animal",
            ),
        ]

    def __str__(self):
        owner = self.beneficiary.full_name if self.beneficiary else "Unknown"
        return (
            f"{self.animal.tag_id} → {owner} "
            f"({self.get_transfer_type_display()}, {self.start_date})"
        )


class ReDispersalRequest(models.Model):
    """Workflow request for re-dispersal, used when Barangay Coordinators submit requests.

    This enables an approval workflow: Coordinator submits → Supervisor reviews →
    On APPROVED, a service function creates the actual OwnershipRecord transition.
    """

    class RequestStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    animal = models.ForeignKey(
        "livestock.Animal",
        on_delete=models.PROTECT,
        related_name="redispersal_requests",
    )
    requested_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="submitted_requests",
    )
    reason = models.TextField()
    requested_new_beneficiary = models.ForeignKey(
        "beneficiaries.Beneficiary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="May be decided later if not yet identified.",
    )

    status = models.CharField(
        max_length=10,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
    )
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_requests",
    )
    review_notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Request for {self.animal.tag_id} — {self.get_status_display()}"

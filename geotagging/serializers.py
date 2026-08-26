from rest_framework import serializers
from .models import GeoTag, Caretaker, Custodianship, LocationCheckIn, HandoffReason


# ---------------------------------------------------------------------------
# Lookup
# ---------------------------------------------------------------------------

class HandoffReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandoffReason
        fields = ["id", "name", "description", "is_active"]


# ---------------------------------------------------------------------------
# Caretaker
# ---------------------------------------------------------------------------

class CaretakerSerializer(serializers.ModelSerializer):
    caretaker_type_display = serializers.CharField(
        source="get_caretaker_type_display", read_only=True
    )
    barangay_name = serializers.CharField(
        source="barangay.__str__", read_only=True, default=""
    )
    beneficiary_name = serializers.SerializerMethodField()

    class Meta:
        model = Caretaker
        fields = [
            "id", "beneficiary", "beneficiary_name",
            "full_name", "contact_number", "barangay", "barangay_name",
            "address_text", "caretaker_type", "caretaker_type_display",
            "default_latitude", "default_longitude",
            "created_at",
        ]

    def get_beneficiary_name(self, obj):
        if obj.beneficiary:
            return obj.beneficiary.full_name
        return None


# ---------------------------------------------------------------------------
# GeoTag
# ---------------------------------------------------------------------------

class GeoTagSerializer(serializers.ModelSerializer):
    tag_type_display = serializers.CharField(
        source="get_tag_type_display", read_only=True
    )
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    species_name = serializers.CharField(
        source="animal.species.name", read_only=True, default=""
    )
    tagged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GeoTag
        fields = [
            "id", "animal", "animal_tag", "species_name",
            "tag_code", "tag_type", "tag_type_display",
            "date_tagged", "tagged_by", "tagged_by_name",
            "is_active", "replacement_of",
            "last_checkin", "last_device_ping",
            "created_at", "updated_at",
        ]
        read_only_fields = ["tag_code", "date_tagged", "created_at", "updated_at"]

    def get_tagged_by_name(self, obj):
        if obj.tagged_by:
            return obj.tagged_by.get_full_name() or obj.tagged_by.username
        return None


class GeoTagListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    species_name = serializers.CharField(
        source="animal.species.name", read_only=True, default=""
    )

    class Meta:
        model = GeoTag
        fields = [
            "id", "animal", "animal_tag", "species_name",
            "tag_code", "tag_type", "is_active",
            "date_tagged", "last_checkin",
        ]


# ---------------------------------------------------------------------------
# Custodianship
# ---------------------------------------------------------------------------

class CustodianshipSerializer(serializers.ModelSerializer):
    tag_code = serializers.CharField(source="geo_tag.tag_code", read_only=True)
    animal_tag = serializers.CharField(source="geo_tag.animal.tag_id", read_only=True)
    caretaker_name = serializers.CharField(source="caretaker.full_name", read_only=True)
    caretaker_type = serializers.CharField(source="caretaker.caretaker_type", read_only=True)
    intake_condition_display = serializers.CharField(
        source="get_intake_condition_display", read_only=True
    )
    exit_condition_display = serializers.SerializerMethodField()
    end_reason_name = serializers.CharField(
        source="end_reason.name", read_only=True, default=None
    )
    has_dispersion_link = serializers.SerializerMethodField()

    class Meta:
        model = Custodianship
        fields = [
            "id", "geo_tag", "tag_code", "animal_tag",
            "caretaker", "caretaker_name", "caretaker_type",
            "linked_dispersal_record", "has_dispersion_link",
            "start_date", "start_latitude", "start_longitude",
            "intake_condition", "intake_condition_display",
            "end_date", "end_latitude", "end_longitude",
            "end_reason", "end_reason_name",
            "exit_condition", "exit_condition_display",
            "status", "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_exit_condition_display(self, obj):
        if obj.exit_condition:
            return obj.get_exit_condition_display()
        return None

    def get_has_dispersion_link(self, obj):
        return obj.linked_dispersal_record is not None


class CustodianshipListSerializer(serializers.ModelSerializer):
    """Lightweight for list views."""
    tag_code = serializers.CharField(source="geo_tag.tag_code", read_only=True)
    animal_tag = serializers.CharField(source="geo_tag.animal.tag_id", read_only=True)
    caretaker_name = serializers.CharField(source="caretaker.full_name", read_only=True)

    class Meta:
        model = Custodianship
        fields = [
            "id", "tag_code", "animal_tag",
            "caretaker", "caretaker_name",
            "start_date", "end_date", "status",
        ]


# ---------------------------------------------------------------------------
# LocationCheckIn
# ---------------------------------------------------------------------------

class LocationCheckInSerializer(serializers.ModelSerializer):
    checked_in_by_name = serializers.SerializerMethodField()
    source_display = serializers.CharField(source="get_source_display", read_only=True)

    class Meta:
        model = LocationCheckIn
        fields = [
            "id", "custodianship",
            "latitude", "longitude",
            "checked_in_at", "checked_in_by", "checked_in_by_name",
            "source", "source_display",
            "photo", "notes",
        ]
        read_only_fields = ["checked_in_at"]

    def get_checked_in_by_name(self, obj):
        if obj.checked_in_by:
            return obj.checked_in_by.get_full_name() or obj.checked_in_by.username
        return None


# ---------------------------------------------------------------------------
# Request serializers for custom actions
# ---------------------------------------------------------------------------

class TagAnimalSerializer(serializers.Serializer):
    """Request body for POST /api/v1/geotagging/tags/"""
    animal_id = serializers.IntegerField()
    tag_type = serializers.ChoiceField(choices=GeoTag.TagType.choices)
    caretaker_id = serializers.IntegerField(required=False, allow_null=True)
    # New caretaker fields (if caretaker_id not provided)
    caretaker_full_name = serializers.CharField(required=False, allow_blank=True, default="")
    caretaker_contact = serializers.CharField(required=False, allow_blank=True, default="")
    caretaker_barangay_id = serializers.IntegerField(required=False, allow_null=True)
    caretaker_address = serializers.CharField(required=False, allow_blank=True, default="")
    caretaker_type = serializers.ChoiceField(
        choices=Caretaker.CaretakerType.choices, required=False,
        default=Caretaker.CaretakerType.FORMAL_BENEFICIARY,
    )
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    intake_condition = serializers.ChoiceField(
        choices=Custodianship.IntakeCondition.choices, default="HEALTHY"
    )


class HandoffSerializer(serializers.Serializer):
    """Request body for POST /api/v1/geotagging/handoff/"""
    geo_tag_id = serializers.IntegerField()
    new_caretaker_id = serializers.IntegerField(required=False, allow_null=True)
    # New caretaker fields
    caretaker_full_name = serializers.CharField(required=False, allow_blank=True, default="")
    caretaker_contact = serializers.CharField(required=False, allow_blank=True, default="")
    caretaker_barangay_id = serializers.IntegerField(required=False, allow_null=True)
    caretaker_address = serializers.CharField(required=False, allow_blank=True, default="")
    caretaker_type = serializers.ChoiceField(
        choices=Caretaker.CaretakerType.choices, required=False,
        default=Caretaker.CaretakerType.INFORMAL_CARETAKER,
    )
    end_reason_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    exit_condition = serializers.ChoiceField(
        choices=Custodianship.ExitCondition.choices, default="HEALTHY"
    )
    intake_condition = serializers.ChoiceField(
        choices=Custodianship.IntakeCondition.choices, default="HEALTHY"
    )


class CheckInSerializer(serializers.Serializer):
    """Request body for POST /api/v1/geotagging/checkins/"""
    custodianship_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    source = serializers.ChoiceField(choices=LocationCheckIn.CheckInSource.choices, default="FIELD_VISIT")
    photo = serializers.ImageField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class RetireTagSerializer(serializers.Serializer):
    """Request body for POST /api/v1/geotagging/tags/{id}/retire/"""
    reason_id = serializers.IntegerField(required=False, allow_null=True)

from rest_framework import serializers
from .models import OwnershipRecord, TransferReason, ReDispersalRequest


class TransferReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransferReason
        fields = ["id", "name", "description", "is_active"]


class OwnershipRecordSerializer(serializers.ModelSerializer):
    """Full ownership record with joined names for display."""
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    beneficiary_name = serializers.SerializerMethodField()
    transfer_type_display = serializers.CharField(
        source="get_transfer_type_display", read_only=True
    )
    condition_display = serializers.CharField(
        source="get_condition_at_transfer_display", read_only=True
    )
    end_reason_name = serializers.CharField(
        source="end_reason.name", read_only=True, default=None
    )
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OwnershipRecord
        fields = [
            "id", "animal", "animal_tag",
            "beneficiary", "beneficiary_name",
            "transfer_type", "transfer_type_display",
            "status", "start_date", "end_date",
            "start_latitude", "start_longitude",
            "end_reason", "end_reason_name", "end_remarks",
            "condition_at_transfer", "condition_display",
            "offspring_count_returned",
            "processed_by", "processed_by_name",
            "contract_document", "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_beneficiary_name(self, obj):
        return obj.beneficiary.full_name if obj.beneficiary else None

    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return obj.processed_by.get_full_name() or obj.processed_by.username
        return None


class OwnershipRecordListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    beneficiary_name = serializers.SerializerMethodField()
    species_name = serializers.CharField(
        source="animal.species.name", read_only=True
    )

    class Meta:
        model = OwnershipRecord
        fields = [
            "id", "animal", "animal_tag", "species_name",
            "beneficiary", "beneficiary_name",
            "transfer_type", "status",
            "start_date", "end_date",
            "start_latitude", "start_longitude",
            "created_at",
        ]

    def get_beneficiary_name(self, obj):
        return obj.beneficiary.full_name if obj.beneficiary else None


# ---------------------------------------------------------------------------
# Request serializers for custom actions
# ---------------------------------------------------------------------------

class DisperseAnimalSerializer(serializers.Serializer):
    """Request body for POST /api/v1/dispersal/disperse/"""
    animal_id = serializers.IntegerField()
    beneficiary_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    condition_at_transfer = serializers.ChoiceField(
        choices=OwnershipRecord.ConditionAtTransfer.choices,
        default="HEALTHY",
    )
    start_date = serializers.DateField(required=False, allow_null=True)


class RedisperseAnimalSerializer(serializers.Serializer):
    """Request body for POST /api/v1/dispersal/redisperse/"""
    animal_id = serializers.IntegerField()
    new_beneficiary_id = serializers.IntegerField()
    end_reason_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    condition_at_transfer = serializers.ChoiceField(
        choices=OwnershipRecord.ConditionAtTransfer.choices,
        default="HEALTHY",
    )
    remarks = serializers.CharField(required=False, allow_blank=True, default="")
    offspring_count_returned = serializers.IntegerField(required=False, default=0)
    start_date = serializers.DateField(required=False, allow_null=True)


class ReturnToCVOSerializer(serializers.Serializer):
    """Request body for POST /api/v1/dispersal/return-to-cvo/"""
    animal_id = serializers.IntegerField()
    reason_id = serializers.IntegerField()
    condition = serializers.ChoiceField(
        choices=OwnershipRecord.ConditionAtTransfer.choices,
        default="HEALTHY",
    )
    remarks = serializers.CharField(required=False, allow_blank=True, default="")
    offspring_count_returned = serializers.IntegerField(required=False, default=0)


class ReDispersalRequestSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ReDispersalRequest
        fields = [
            "id", "animal", "animal_tag",
            "requested_by", "requested_by_name",
            "reason", "requested_new_beneficiary",
            "status", "reviewed_by", "reviewed_by_name",
            "review_notes", "created_at", "reviewed_at",
        ]
        read_only_fields = ["requested_by", "status", "reviewed_by", "reviewed_at"]

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

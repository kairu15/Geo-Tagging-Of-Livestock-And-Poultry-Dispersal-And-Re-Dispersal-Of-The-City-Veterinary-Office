from rest_framework import serializers
from .models import DiseaseType, HealthEvent, QuarantineZone


class DiseaseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseType
        fields = ["id", "name", "description", "is_active"]


class HealthEventSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    species_name = serializers.CharField(source="animal.species.name", read_only=True, default="")
    disease_name = serializers.CharField(source="disease_suspected.name", read_only=True, default=None)
    reported_by_name = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    report_status_display = serializers.CharField(source="get_report_status_display", read_only=True)

    class Meta:
        model = HealthEvent
        fields = [
            "id", "animal", "animal_tag", "species_name",
            "event_type", "event_type_display",
            "disease_suspected", "disease_name",
            "severity", "severity_display",
            "event_date", "reported_by", "reported_by_name",
            "latitude", "longitude",
            "notes", "photo",
            "report_status", "report_status_display",
            "reviewed_by", "review_notes", "reviewed_at",
            "is_archived", "created_at", "updated_at",
        ]
        read_only_fields = [
            "reported_by", "reviewed_by", "reviewed_at",
            "created_at", "updated_at",
        ]

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name() or obj.reported_by.username
        return None


class HealthEventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    animal_tag = serializers.CharField(source="animal.tag_id", read_only=True)
    species_name = serializers.CharField(source="animal.species.name", read_only=True, default="")
    disease_name = serializers.CharField(source="disease_suspected.name", read_only=True, default=None)
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = HealthEvent
        fields = [
            "id", "animal", "animal_tag", "species_name",
            "event_type", "event_type_display",
            "disease_suspected", "disease_name",
            "severity", "event_date",
            "latitude", "longitude",
            "report_status", "is_archived", "created_at",
        ]


class QuarantineZoneSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(source="disease_type.name", read_only=True)
    barangay_name = serializers.CharField(source="barangay.__str__", read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuarantineZone
        fields = [
            "id", "name",
            "barangay", "barangay_name",
            "disease_type", "disease_name",
            "boundary_geojson",
            "start_date", "end_date",
            "is_active", "is_blocking",
            "notes", "created_by", "created_by_name",
            "is_current", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class DiseaseReportSubmitSerializer(serializers.Serializer):
    """Request body for POST /api/v1/health/report/ — field report from coordinators."""
    animal_id = serializers.IntegerField()
    event_type = serializers.ChoiceField(choices=HealthEvent.EventType.choices)
    disease_suspected_id = serializers.IntegerField(required=False, allow_null=True)
    severity = serializers.ChoiceField(
        choices=HealthEvent.Severity.choices,
        default="LOW",
    )
    event_date = serializers.DateField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    photo = serializers.ImageField(required=False, allow_null=True)

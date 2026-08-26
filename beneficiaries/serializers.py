from rest_framework import serializers
from .models import Beneficiary, Barangay


class BarangaySerializer(serializers.ModelSerializer):
    beneficiary_count = serializers.SerializerMethodField()

    class Meta:
        model = Barangay
        fields = ["id", "name", "city_municipality", "boundary_geojson", "beneficiary_count"]

    def get_beneficiary_count(self, obj):
        return obj.beneficiaries.filter(is_archived=False).count()


class BeneficiaryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    barangay_name = serializers.CharField(source="barangay.__str__", read_only=True)
    full_name = serializers.CharField(read_only=True)
    current_animal_count = serializers.SerializerMethodField()

    class Meta:
        model = Beneficiary
        fields = [
            "id", "full_name", "first_name", "last_name",
            "barangay", "barangay_name", "contact_number",
            "is_active_beneficiary", "latitude", "longitude",
            "date_registered", "current_animal_count",
        ]

    def get_current_animal_count(self, obj):
        return obj.current_animals.count()


class BeneficiaryDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views."""
    barangay_name = serializers.CharField(source="barangay.__str__", read_only=True)
    full_name = serializers.CharField(read_only=True)
    registered_by_name = serializers.CharField(
        source="registered_by.get_full_name", read_only=True, default=""
    )
    current_animal_count = serializers.SerializerMethodField()

    class Meta:
        model = Beneficiary
        fields = [
            "id", "first_name", "middle_name", "last_name", "suffix",
            "full_name", "contact_number", "email",
            "barangay", "barangay_name", "sitio_purok", "full_address",
            "valid_id_type", "valid_id_number", "id_image",
            "household_head", "livelihood_type",
            "is_active_beneficiary", "date_registered", "registered_by",
            "registered_by_name",
            "latitude", "longitude",
            "is_archived", "current_animal_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["date_registered", "created_at", "updated_at"]

    def get_current_animal_count(self, obj):
        from livestock.models import Animal
        return Animal.objects.filter(
            current_owner=obj,
            current_status=Animal.Status.DISPERSED,
        ).count()

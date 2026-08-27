from rest_framework import serializers
from .models import Species, Breed, Animal, HealthRecord, Offspring


class SpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Species
        fields = ["id", "name", "category"]


class BreedSerializer(serializers.ModelSerializer):
    species_name = serializers.CharField(source="species.name", read_only=True)

    class Meta:
        model = Breed
        fields = ["id", "species", "species_name", "name"]


class AnimalListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views with joined fields."""
    species_name = serializers.CharField(source="species.name", read_only=True)
    breed_name = serializers.CharField(source="breed.name", read_only=True, default="")
    current_owner_name = serializers.SerializerMethodField()
    current_status_display = serializers.CharField(
        source="get_current_status_display", read_only=True
    )

    class Meta:
        model = Animal
        fields = [
            "id", "tag_id", "species", "species_name",
            "breed", "breed_name",
            "sex", "birth_date", "estimated_age_months",
            "color_markings", "weight_kg", "photo",
            "is_batch", "batch_quantity",
            "current_owner", "current_owner_name",
            "current_status", "current_status_display",
            "date_acquired_by_cvo", "source",
            "created_at",
        ]

    def get_current_owner_name(self, obj):
        if obj.current_owner:
            return obj.current_owner.full_name
        return None


class AnimalDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views."""
    species_name = serializers.CharField(source="species.name", read_only=True)
    breed_name = serializers.CharField(source="breed.name", read_only=True, default="")
    current_owner_name = serializers.SerializerMethodField()
    current_status_display = serializers.CharField(
        source="get_current_status_display", read_only=True
    )
    health_records = serializers.SerializerMethodField()

    class Meta:
        model = Animal
        fields = [
            "id", "tag_id", "species", "species_name",
            "breed", "breed_name",
            "sex", "birth_date", "estimated_age_months",
            "color_markings", "weight_kg", "photo",
            "is_batch", "batch_quantity", "parent_batch",
            "current_owner", "current_owner_name",
            "current_status", "current_status_display",
            "date_acquired_by_cvo", "source",
            "health_records",
            "is_archived",
            "created_at", "updated_at",
        ]

    def get_current_owner_name(self, obj):
        if obj.current_owner:
            return obj.current_owner.full_name
        return None

    def get_health_records(self, obj):
        records = obj.health_records.all()[:10]
        return HealthRecordSerializer(records, many=True).data


class AnimalRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for registering a new animal into the AVAILABLE pool."""
    class Meta:
        model = Animal
        fields = [
            "id", "species", "breed", "sex",
            "birth_date", "estimated_age_months",
            "color_markings", "weight_kg", "photo",
            "is_batch", "batch_quantity", "source",
        ]


class HealthRecordSerializer(serializers.ModelSerializer):
    veterinarian_name = serializers.CharField(
        source="veterinarian.get_full_name", read_only=True, default=""
    )
    record_type_display = serializers.CharField(
        source="get_record_type_display", read_only=True
    )

    class Meta:
        model = HealthRecord
        fields = [
            "id", "animal", "record_type", "record_type_display",
            "date", "veterinarian", "veterinarian_name",
            "notes", "attachment", "created_at",
        ]
        read_only_fields = ["created_at"]


class OffspringSerializer(serializers.ModelSerializer):
    dam_tag = serializers.CharField(source="dam.tag_id", read_only=True)
    child_tag = serializers.SerializerMethodField()
    child_species_name = serializers.CharField(source="child_species.name", read_only=True, default="")
    held_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Offspring
        fields = [
            "id", "dam", "dam_tag",
            "child", "child_tag",
            "child_tag_id", "child_sex", "child_species", "child_species_name",
            "birth_date", "litter_size",
            "status", "status_display",
            "returned_to_cvo_date",
            "held_by", "held_by_name",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_child_tag(self, obj):
        if obj.child:
            return obj.child.tag_id
        return obj.child_tag_id or None

    def get_held_by_name(self, obj):
        if obj.held_by:
            return obj.held_by.full_name
        return None


class OffspringCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offspring
        fields = [
            "dam", "child", "child_tag_id", "child_sex", "child_species",
            "birth_date", "litter_size", "status", "held_by", "notes",
        ]

from django.contrib import admin
from .models import Species, Breed, Animal, HealthRecord


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ("name", "category")
    list_filter = ("category",)


@admin.register(Breed)
class BreedAdmin(admin.ModelAdmin):
    list_display = ("name", "species")
    list_filter = ("species",)


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = (
        "tag_id", "species", "breed", "sex",
        "current_status", "current_owner", "is_batch", "batch_quantity",
    )
    list_filter = ("species", "current_status", "sex", "is_batch")
    search_fields = ("tag_id", "color_markings")
    readonly_fields = ("tag_id", "created_at", "updated_at")


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ("animal", "record_type", "date", "veterinarian")
    list_filter = ("record_type", "date")
    search_fields = ("animal__tag_id", "notes")

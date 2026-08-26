from django.contrib import admin
from .models import GeoTag, Caretaker, Custodianship, LocationCheckIn, HandoffReason


@admin.register(HandoffReason)
class HandoffReasonAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active"]
    list_filter = ["is_active"]


@admin.register(Caretaker)
class CaretakerAdmin(admin.ModelAdmin):
    list_display = ["full_name", "caretaker_type", "barangay", "contact_number"]
    list_filter = ["caretaker_type", "barangay"]
    search_fields = ["full_name", "contact_number"]


@admin.register(GeoTag)
class GeoTagAdmin(admin.ModelAdmin):
    list_display = ["tag_code", "animal", "tag_type", "is_active", "date_tagged"]
    list_filter = ["is_active", "tag_type"]
    search_fields = ["tag_code", "animal__tag_id"]
    readonly_fields = ["tag_code"]


@admin.register(Custodianship)
class CustodianshipAdmin(admin.ModelAdmin):
    list_display = [
        "geo_tag", "caretaker", "start_date", "end_date", "status",
    ]
    list_filter = ["status", "intake_condition"]
    search_fields = ["geo_tag__tag_code", "caretaker__full_name"]


@admin.register(LocationCheckIn)
class LocationCheckInAdmin(admin.ModelAdmin):
    list_display = ["custodianship", "latitude", "longitude", "source", "checked_in_at"]
    list_filter = ["source"]

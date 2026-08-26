from django.contrib import admin
from .models import Beneficiary, Barangay


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    list_display = ("name", "city_municipality")
    search_fields = ("name", "city_municipality")


@admin.register(Beneficiary)
class BeneficiaryAdmin(admin.ModelAdmin):
    list_display = (
        "full_name", "barangay", "contact_number",
        "is_active_beneficiary", "date_registered",
    )
    list_filter = ("barangay", "is_active_beneficiary", "household_head")
    search_fields = ("first_name", "last_name", "contact_number")

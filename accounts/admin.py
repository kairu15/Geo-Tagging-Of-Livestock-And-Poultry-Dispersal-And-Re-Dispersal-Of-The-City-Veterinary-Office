from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "is_active_officer", "assigned_barangay")
    list_filter = ("role", "is_active_officer", "assigned_barangay")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("CVO Info", {"fields": ("role", "contact_number", "assigned_barangay", "is_active_officer")}),
    )

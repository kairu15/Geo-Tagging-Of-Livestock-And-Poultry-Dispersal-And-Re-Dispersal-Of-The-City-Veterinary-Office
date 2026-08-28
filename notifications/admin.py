from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "notification_type", "recipient", "is_read", "is_archived", "created_at")
    list_filter = ("notification_type", "is_read", "is_archived")
    search_fields = ("title", "message", "recipient__username")
    readonly_fields = ("created_at",)

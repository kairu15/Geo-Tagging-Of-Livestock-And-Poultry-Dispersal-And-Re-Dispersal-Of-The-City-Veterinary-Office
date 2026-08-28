from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    target_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "is_read",
            "created_at",
            "target_url",
            "related_health_event",
            "related_quarantine_zone",
            "related_ownership_record",
            "related_offspring",
        ]
        read_only_fields = fields

    def get_target_url(self, obj):
        return obj.get_absolute_url()


class NotificationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for the list / dropdown panel."""
    target_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "is_read",
            "created_at",
            "target_url",
        ]
        read_only_fields = fields

    def get_target_url(self, obj):
        return obj.get_absolute_url()

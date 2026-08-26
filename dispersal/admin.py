from django.contrib import admin
from .models import OwnershipRecord, TransferReason, ReDispersalRequest


@admin.register(TransferReason)
class TransferReasonAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)


@admin.register(OwnershipRecord)
class OwnershipRecordAdmin(admin.ModelAdmin):
    list_display = (
        "animal", "beneficiary", "transfer_type", "status",
        "start_date", "end_date", "processed_by",
    )
    list_filter = ("transfer_type", "status", "condition_at_transfer")
    search_fields = ("animal__tag_id", "beneficiary__first_name", "beneficiary__last_name")
    raw_id_fields = ("animal", "beneficiary", "processed_by", "end_reason")


@admin.register(ReDispersalRequest)
class ReDispersalRequestAdmin(admin.ModelAdmin):
    list_display = ("animal", "requested_by", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("animal__tag_id",)
    raw_id_fields = ("animal", "requested_by", "requested_new_beneficiary", "reviewed_by")

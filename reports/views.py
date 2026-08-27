import csv
from datetime import timedelta
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from dispersal.models import OwnershipRecord


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dispersal_summary_view(request):
    """GET /api/v1/reports/dispersal-summary/ — Summary statistics."""
    qs = OwnershipRecord.objects.select_related(
        "animal", "animal__species", "beneficiary", "beneficiary__barangay",
    )

    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")
    barangay = request.query_params.get("barangay")
    species = request.query_params.get("species")

    if date_from:
        qs = qs.filter(start_date__gte=date_from)
    if date_to:
        qs = qs.filter(start_date__lte=date_to)
    if barangay:
        qs = qs.filter(beneficiary__barangay_id=barangay)
    if species:
        qs = qs.filter(animal__species_id=species)

    total_dispersals = qs.filter(transfer_type="INITIAL_DISPERSAL").count()
    total_redispersals = qs.filter(transfer_type="RE_DISPERSAL").count()

    by_species = (
        qs.values("animal__species__name")
        .annotate(
            dispersals=Count("id", filter=Q(transfer_type="INITIAL_DISPERSAL")),
            redispersals=Count("id", filter=Q(transfer_type="RE_DISPERSAL")),
        )
        .order_by("-dispersals")
    )

    by_barangay = (
        qs.values("beneficiary__barangay__name")
        .annotate(
            dispersals=Count("id", filter=Q(transfer_type="INITIAL_DISPERSAL")),
            redispersals=Count("id", filter=Q(transfer_type="RE_DISPERSAL")),
        )
        .order_by("-dispersals")
    )

    return Response({
        "total_dispersals": total_dispersals,
        "total_redispersals": total_redispersals,
        "by_species": list(by_species),
        "by_barangay": list(by_barangay),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def redispersal_frequency_view(request):
    """GET /api/v1/reports/redispersal-frequency/ — Animals/beneficiaries with high transfer counts."""
    # Animals with 2+ transfers — include species name
    animals = (
        OwnershipRecord.objects
        .select_related("animal", "animal__species")
        .values("animal__tag_id", "animal__id", "animal__species__name")
        .annotate(transfer_count=Count("id"))
        .filter(transfer_count__gte=2)
        .order_by("-transfer_count")
    )
    animal_results = [
        {
            "id": a["animal__id"],
            "tag_id": a["animal__tag_id"],
            "species": a["animal__species__name"],
            "transfer_count": a["transfer_count"],
        }
        for a in animals
    ]

    # Beneficiaries with 2+ received animals — include barangay name
    beneficiaries = (
        OwnershipRecord.objects
        .select_related("beneficiary", "beneficiary__barangay")
        .values("beneficiary__id", "beneficiary__first_name", "beneficiary__last_name", "beneficiary__barangay__name")
        .annotate(total_received=Count("id"))
        .filter(total_received__gte=2)
        .order_by("-total_received")
    )
    ben_results = [
        {
            "id": b["beneficiary__id"],
            "name": f"{b['beneficiary__first_name']} {b['beneficiary__last_name']}",
            "barangay": b["beneficiary__barangay__name"],
            "total_received": b["total_received"],
        }
        for b in beneficiaries
    ]

    return Response({
        "most_transferred_animals": animal_results,
        "most_active_beneficiaries": ben_results,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dispersal_csv_export(request):
    """GET /api/v1/reports/dispersal-export/ — CSV export of dispersal records."""
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")
    barangay = request.query_params.get("barangay")
    species = request.query_params.get("species")

    qs = OwnershipRecord.objects.select_related(
        "animal", "animal__species", "beneficiary", "beneficiary__barangay", "end_reason",
    )

    if date_from:
        qs = qs.filter(start_date__gte=date_from)
    if date_to:
        qs = qs.filter(start_date__lte=date_to)
    if barangay:
        qs = qs.filter(beneficiary__barangay_id=barangay)
    if species:
        qs = qs.filter(animal__species_id=species)

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="dispersal_report.csv"'

    writer = csv.writer(response)
    writer.writerow([
        "Animal Tag", "Species", "Beneficiary", "Barangay",
        "Transfer Type", "Status", "Start Date", "End Date",
        "Latitude", "Longitude", "Condition", "End Reason", "Remarks",
    ])

    for rec in qs:
        writer.writerow([
            rec.animal.tag_id,
            rec.animal.species.name if rec.animal.species else "",
            rec.beneficiary.full_name if rec.beneficiary else "",
            rec.beneficiary.barangay.name if rec.beneficiary and rec.beneficiary.barangay else "",
            rec.get_transfer_type_display(),
            rec.get_status_display(),
            rec.start_date,
            rec.end_date or "",
            rec.start_latitude or "",
            rec.start_longitude or "",
            rec.get_condition_at_transfer_display(),
            rec.end_reason.name if rec.end_reason else "",
            rec.end_remarks or "",
        ])

    return response


# ---------------------------------------------------------------------------
# Overdue Offspring Pass-On Report
# ---------------------------------------------------------------------------
# Assumption: The "pass-on obligation" means that beneficiaries with active
# dispersal records are expected to return a minimum number of offspring to
# CVO. The threshold is configurable via the `required_offspring` query param
# (default: 1). A beneficiary is "overdue" if their active record has
# offspring_count_returned < required_offspring AND the custody has been active
# longer than the overdue_days threshold (default: 365 days).
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overdue_offspring_view(request):
    """GET /api/v1/reports/overdue-offspring/ — Beneficiaries overdue on pass-on obligation.

    Query params:
      overdue_days: int — minimum days of active custody before flagged (default 365)
      required_offspring: int — minimum offspring to return (default 1)
      barangay: int — filter by barangay ID
      species: int — filter by species ID
    """
    overdue_days = int(request.query_params.get("overdue_days", 365))
    required_offspring = int(request.query_params.get("required_offspring", 1))
    barangay = request.query_params.get("barangay")
    species = request.query_params.get("species")

    cutoff_date = timezone.now().date() - timedelta(days=overdue_days)

    qs = (
        OwnershipRecord.objects
        .filter(
            status=OwnershipRecord.RecordStatus.ACTIVE,
            transfer_type=OwnershipRecord.TransferType.INITIAL_DISPERSAL,
            start_date__lte=cutoff_date,
        )
        .select_related(
            "animal", "animal__species",
            "beneficiary", "beneficiary__barangay",
        )
    )

    if barangay:
        qs = qs.filter(beneficiary__barangay_id=barangay)
    if species:
        qs = qs.filter(animal__species_id=species)

    # Filter to those who haven't met the obligation
    results = []
    for record in qs:
        if record.offspring_count_returned < required_offspring:
            days_active = (timezone.now().date() - record.start_date).days
            results.append({
                "ownership_record_id": record.id,
                "animal_id": record.animal.id,
                "animal_tag": record.animal.tag_id,
                "species": record.animal.species.name if record.animal.species else None,
                "beneficiary_id": record.beneficiary.id,
                "beneficiary_name": record.beneficiary.full_name,
                "barangay": record.beneficiary.barangay.name if record.beneficiary.barangay else None,
                "start_date": str(record.start_date),
                "days_active": days_active,
                "offspring_count_returned": record.offspring_count_returned,
                "required_offspring": required_offspring,
                "shortfall": required_offspring - record.offspring_count_returned,
            })

    # Summary
    summary = {
        "total_overdue": len(results),
        "overdue_days_threshold": overdue_days,
        "required_offspring": required_offspring,
        "by_species": {},
        "by_barangay": {},
    }
    for r in results:
        sp = r["species"] or "Unknown"
        br = r["barangay"] or "Unknown"
        summary["by_species"][sp] = summary["by_species"].get(sp, 0) + 1
        summary["by_barangay"][br] = summary["by_barangay"].get(br, 0) + 1

    return Response({
        "summary": summary,
        "results": results,
    })

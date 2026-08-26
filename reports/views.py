import csv
from django.db.models import Count, Q
from django.http import HttpResponse
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

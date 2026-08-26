import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from dispersal.models import OwnershipRecord


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

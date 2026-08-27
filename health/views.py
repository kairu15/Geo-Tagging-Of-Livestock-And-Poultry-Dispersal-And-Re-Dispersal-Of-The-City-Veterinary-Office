"""
Health/Disease Surveillance views.

Provides:
- CRUD for DiseaseType, HealthEvent, QuarantineZone
- Disease report submission endpoint (field reports from coordinators)
- Radius search endpoint for outbreak response
- Quarantine zone check endpoint
"""
import math
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes as perm_decorator
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DiseaseType, HealthEvent, QuarantineZone
from .serializers import (
    DiseaseTypeSerializer,
    HealthEventSerializer,
    HealthEventListSerializer,
    QuarantineZoneSerializer,
    DiseaseReportSubmitSerializer,
)
from accounts.permissions import IsOfficerOrAbove, IsSupervisorOrAbove, IsReadOnly


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------

class DiseaseTypeViewSet(viewsets.ModelViewSet):
    queryset = DiseaseType.objects.all()
    serializer_class = DiseaseTypeSerializer
    permission_classes = [IsOfficerOrAbove]


class HealthEventViewSet(viewsets.ModelViewSet):
    queryset = HealthEvent.objects.select_related(
        "animal", "animal__species", "disease_suspected", "reported_by",
    ).all()
    permission_classes = [IsReadOnly]
    filterset_fields = ["animal", "event_type", "disease_suspected", "report_status", "severity"]
    search_fields = ["animal__tag_id", "notes"]
    ordering_fields = ["event_date", "created_at", "severity"]

    def get_serializer_class(self):
        if self.action == "list":
            return HealthEventListSerializer
        return HealthEventSerializer

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)


class QuarantineZoneViewSet(viewsets.ModelViewSet):
    queryset = QuarantineZone.objects.select_related(
        "barangay", "disease_type", "created_by",
    ).all()
    permission_classes = [IsReadOnly]
    filterset_fields = ["barangay", "disease_type", "is_active", "is_blocking"]
    search_fields = ["name", "notes"]
    ordering_fields = ["start_date", "created_at"]

    def get_serializer_class(self):
        return QuarantineZoneSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---------------------------------------------------------------------------
# Custom endpoints
# ---------------------------------------------------------------------------

@api_view(["POST"])
@perm_decorator([IsAuthenticated])
def submit_disease_report(request):
    """POST /api/v1/health/report/ — Submit a field disease/health report.

    Accessible to coordinators and field staff. Creates a HealthEvent
    with location capture for outbreak mapping.
    """
    serializer = DiseaseReportSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        from livestock.models import Animal
        animal = Animal.objects.get(pk=data["animal_id"])
    except Animal.DoesNotExist:
        return Response({"error": "Animal not found"}, status=status.HTTP_404_NOT_FOUND)

    disease_type = None
    if data.get("disease_suspected_id"):
        try:
            disease_type = DiseaseType.objects.get(pk=data["disease_suspected_id"])
        except DiseaseType.DoesNotExist:
            return Response({"error": "Disease type not found"}, status=status.HTTP_404_NOT_FOUND)

    event = HealthEvent.objects.create(
        animal=animal,
        event_type=data["event_type"],
        disease_suspected=disease_type,
        severity=data.get("severity", "LOW"),
        event_date=data["event_date"],
        reported_by=request.user,
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        notes=data.get("notes", ""),
        photo=data.get("photo"),
        report_status="SUBMITTED",
    )

    return Response(
        HealthEventSerializer(event).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def radius_search(request):
    """GET /api/v1/health/radius-search/ — Find animals/beneficiaries within N km of a point.

    Uses bounding-box pre-filter + haversine calculation in Python.
    No PostGIS required — performs well for the CVO's scale (hundreds to low thousands
    of animals).

    Query params:
      latitude: float (required)
      longitude: float (required)
      radius_km: float (default 3.0)
      type: 'animals' | 'beneficiaries' | 'all' (default 'all')
    """
    try:
        center_lat = float(request.query_params.get("latitude", 0))
        center_lng = float(request.query_params.get("longitude", 0))
        radius_km = float(request.query_params.get("radius_km", 3.0))
    except (TypeError, ValueError):
        return Response(
            {"error": "Invalid latitude, longitude, or radius_km parameter."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if center_lat == 0 and center_lng == 0:
        return Response(
            {"error": "latitude and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    search_type = request.query_params.get("type", "all")

    def haversine(lat1, lng1, lat2, lng2):
        """Calculate distance in km between two points using haversine formula."""
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlng / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        return R * c

    # Bounding box pre-filter (approximate, reduces haversine calls)
    lat_delta = radius_km / 111.0  # ~111 km per degree latitude
    lng_delta = radius_km / (111.0 * math.cos(math.radians(center_lat)))
    min_lat = center_lat - lat_delta
    max_lat = center_lat + lat_delta
    min_lng = center_lng - lng_delta
    max_lng = center_lng + lng_delta

    features = []

    # Search animals with active ownership records (dispersed animals)
    if search_type in ("animals", "all"):
        from dispersal.models import OwnershipRecord
        from livestock.models import Animal

        active_records = (
            OwnershipRecord.objects
            .filter(
                status="ACTIVE",
                start_latitude__isnull=False,
                start_longitude__isnull=False,
                start_latitude__gte=min_lat,
                start_latitude__lte=max_lat,
                start_longitude__gte=min_lng,
                start_longitude__lte=max_lng,
            )
            .select_related("animal", "animal__species", "beneficiary", "beneficiary__barangay")
        )

        for rec in active_records:
            lat = float(rec.start_latitude)
            lng = float(rec.start_longitude)
            dist = haversine(center_lat, center_lng, lat, lng)
            if dist <= radius_km:
                features.append({
                    "type": "animal",
                    "id": rec.animal.id,
                    "tag_id": rec.animal.tag_id,
                    "species": rec.animal.species.name if rec.animal.species else None,
                    "beneficiary_name": rec.beneficiary.full_name if rec.beneficiary else None,
                    "barangay": rec.beneficiary.barangay.name if rec.beneficiary and rec.beneficiary.barangay else None,
                    "latitude": lat,
                    "longitude": lng,
                    "distance_km": round(dist, 2),
                })

    # Search beneficiaries with coordinates
    if search_type in ("beneficiaries", "all"):
        from beneficiaries.models import Beneficiary

        beneficiaries = Beneficiary.objects.filter(
            is_active_beneficiary=True,
            is_archived=False,
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__gte=min_lat,
            latitude__lte=max_lat,
            longitude__gte=min_lng,
            longitude__lte=max_lng,
        ).select_related("barangay")

        for b in beneficiaries:
            lat = float(b.latitude)
            lng = float(b.longitude)
            dist = haversine(center_lat, center_lng, lat, lng)
            if dist <= radius_km:
                features.append({
                    "type": "beneficiary",
                    "id": b.id,
                    "name": b.full_name,
                    "barangay": b.barangay.name if b.barangay else None,
                    "contact_number": b.contact_number,
                    "latitude": lat,
                    "longitude": lng,
                    "distance_km": round(dist, 2),
                    "animal_count": b.current_animals.count(),
                })

    # Sort by distance
    features.sort(key=lambda f: f["distance_km"])

    return Response({
        "center": {"latitude": center_lat, "longitude": center_lng},
        "radius_km": radius_km,
        "count": len(features),
        "features": features,
    })


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def active_quarantine_zones(request):
    """GET /api/v1/health/quarantine-zones/active/ — All currently active quarantine zones."""
    today = timezone.now().date()
    zones = (
        QuarantineZone.objects
        .filter(
            is_active=True,
            start_date__lte=today,
        )
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        .select_related("barangay", "disease_type")
    )

    data = QuarantineZoneSerializer(zones, many=True).data
    return Response({"zones": data, "count": len(data)})


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def check_quarantine_conflict(request):
    """GET /api/v1/health/quarantine-check/ — Check if a barangay has active quarantine.

    Query params:
      barangay_id: int (required)
      exclude_zone_id: int (optional, to exclude a specific zone from check)

    Returns conflict info including whether the zone is blocking.
    """
    barangay_id = request.query_params.get("barangay_id")
    exclude_zone_id = request.query_params.get("exclude_zone_id")

    if not barangay_id:
        return Response(
            {"error": "barangay_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    today = timezone.now().date()
    qs = (
        QuarantineZone.objects
        .filter(
            barangay_id=barangay_id,
            is_active=True,
            start_date__lte=today,
        )
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        .select_related("disease_type")
    )

    if exclude_zone_id:
        qs = qs.exclude(pk=exclude_zone_id)

    zones = list(qs)
    has_conflict = len(zones) > 0
    is_blocking = any(z.is_blocking for z in zones)

    return Response({
        "has_conflict": has_conflict,
        "is_blocking": is_blocking,
        "zones": [
            {
                "id": z.id,
                "name": z.name,
                "disease_type": z.disease_type.name,
                "is_blocking": z.is_blocking,
                "start_date": str(z.start_date),
                "end_date": str(z.end_date) if z.end_date else None,
                "notes": z.notes,
            }
            for z in zones
        ],
    })

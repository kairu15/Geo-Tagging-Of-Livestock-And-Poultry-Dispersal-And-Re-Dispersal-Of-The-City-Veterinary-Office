from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_decorator
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import OwnershipRecord, TransferReason, ReDispersalRequest
from .serializers import (
    OwnershipRecordSerializer, OwnershipRecordListSerializer,
    TransferReasonSerializer, ReDispersalRequestSerializer,
    DisperseAnimalSerializer, RedisperseAnimalSerializer,
    ReturnToCVOSerializer,
)
from .services import (
    disperse_animal, redisperse_animal, return_animal_to_cvo,
    DomainError,
)
from accounts.permissions import IsOfficerOrAbove, IsSupervisorOrAbove, IsReadOnly
from livestock.models import Animal
from beneficiaries.models import Beneficiary


class TransferReasonViewSet(viewsets.ModelViewSet):
    queryset = TransferReason.objects.filter(is_active=True)
    serializer_class = TransferReasonSerializer
    permission_classes = [IsOfficerOrAbove]


class OwnershipRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of the ownership ledger. Writes go through service endpoints."""
    queryset = OwnershipRecord.objects.select_related(
        "animal", "animal__species", "beneficiary", "end_reason", "processed_by",
    ).all()
    permission_classes = [IsReadOnly]
    filterset_fields = ["animal", "beneficiary", "status", "transfer_type"]
    search_fields = ["animal__tag_id", "beneficiary__first_name", "beneficiary__last_name"]
    ordering_fields = ["start_date", "end_date", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return OwnershipRecordListSerializer
        return OwnershipRecordSerializer


class ReDispersalRequestViewSet(viewsets.ModelViewSet):
    queryset = ReDispersalRequest.objects.select_related(
        "animal", "requested_by", "requested_new_beneficiary", "reviewed_by",
    ).all()
    serializer_class = ReDispersalRequestSerializer
    permission_classes = [IsOfficerOrAbove]
    filterset_fields = ["status", "animal"]

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsSupervisorOrAbove])
    def approve(self, request, pk=None):
        """POST /api/v1/redispersal-requests/{id}/approve/ — Supervisor approves and executes re-dispersal."""
        req = self.get_object()
        if req.status != "PENDING":
            return Response(
                {"error": f"Request is already {req.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Find the current active record to get lat/lng from
            from dispersal.models import OwnershipRecord
            active = OwnershipRecord.objects.filter(
                animal=req.animal, status="ACTIVE"
            ).first()

            new_beneficiary = req.requested_new_beneficiary
            if not new_beneficiary:
                return Response(
                    {"error": "No new beneficiary specified in the request"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            reason = TransferReason.objects.filter(
                name__icontains="beneficiary request"
            ).first() or TransferReason.objects.first()

            redisperse_animal(
                animal=req.animal,
                new_beneficiary=new_beneficiary,
                latitude=active.start_latitude if active else None,
                longitude=active.start_longitude if active else None,
                end_reason=reason,
                processed_by=request.user,
                remarks=f"Approved re-dispersal request #{req.id}: {req.reason}",
            )

            req.status = ReDispersalRequest.RequestStatus.APPROVED
            req.reviewed_by = request.user
            from django.utils import timezone
            req.reviewed_at = timezone.now()
            req.save()

            return Response({"status": "approved", "request_id": req.id})

        except DomainError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], permission_classes=[IsSupervisorOrAbove])
    def reject(self, request, pk=None):
        """POST /api/v1/redispersal-requests/{id}/reject/"""
        req = self.get_object()
        if req.status != "PENDING":
            return Response(
                {"error": f"Request is already {req.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req.status = ReDispersalRequest.RequestStatus.REJECTED
        req.reviewed_by = request.user
        req.review_notes = request.data.get("review_notes", "")
        from django.utils import timezone
        req.reviewed_at = timezone.now()
        req.save()

        return Response({"status": "rejected", "request_id": req.id})


# ---------------------------------------------------------------------------
# Custom action endpoints — the core workflow endpoints
# ---------------------------------------------------------------------------

@api_view(["POST"])
@perm_decorator([IsAuthenticated])
def disperse_view(request):
    """POST /api/v1/dispersal/disperse/ — Initial dispersal of an animal."""
    serializer = DisperseAnimalSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        animal = Animal.objects.get(pk=data["animal_id"])
        beneficiary = Beneficiary.objects.get(pk=data["beneficiary_id"])

        record = disperse_animal(
            animal=animal,
            beneficiary=beneficiary,
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            processed_by=request.user,
            condition_at_transfer=data.get("condition_at_transfer", "HEALTHY"),
            start_date=data.get("start_date"),
        )

        return Response(
            OwnershipRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )

    except Animal.DoesNotExist:
        return Response({"error": "Animal not found"}, status=status.HTTP_404_NOT_FOUND)
    except Beneficiary.DoesNotExist:
        return Response({"error": "Beneficiary not found"}, status=status.HTTP_404_NOT_FOUND)
    except DomainError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@perm_decorator([IsAuthenticated])
def redisperse_view(request):
    """POST /api/v1/dispersal/redisperse/ — Re-disperse to a new beneficiary."""
    serializer = RedisperseAnimalSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        animal = Animal.objects.get(pk=data["animal_id"])
        new_beneficiary = Beneficiary.objects.get(pk=data["new_beneficiary_id"])
        end_reason = TransferReason.objects.get(pk=data["end_reason_id"])

        record = redisperse_animal(
            animal=animal,
            new_beneficiary=new_beneficiary,
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            end_reason=end_reason,
            processed_by=request.user,
            condition_at_transfer=data.get("condition_at_transfer", "HEALTHY"),
            remarks=data.get("remarks", ""),
            offspring_count_returned=data.get("offspring_count_returned", 0),
            start_date=data.get("start_date"),
        )

        return Response(
            OwnershipRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )

    except Animal.DoesNotExist:
        return Response({"error": "Animal not found"}, status=status.HTTP_404_NOT_FOUND)
    except Beneficiary.DoesNotExist:
        return Response({"error": "New beneficiary not found"}, status=status.HTTP_404_NOT_FOUND)
    except TransferReason.DoesNotExist:
        return Response({"error": "Transfer reason not found"}, status=status.HTTP_404_NOT_FOUND)
    except DomainError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@perm_decorator([IsAuthenticated])
def return_to_cvo_view(request):
    """POST /api/v1/dispersal/return-to-cvo/ — Return animal to CVO custody."""
    serializer = ReturnToCVOSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        animal = Animal.objects.get(pk=data["animal_id"])
        reason = TransferReason.objects.get(pk=data["reason_id"])

        record = return_animal_to_cvo(
            animal=animal,
            reason=reason,
            processed_by=request.user,
            condition=data.get("condition", "HEALTHY"),
            remarks=data.get("remarks", ""),
            offspring_count_returned=data.get("offspring_count_returned", 0),
        )

        return Response(
            OwnershipRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )

    except Animal.DoesNotExist:
        return Response({"error": "Animal not found"}, status=status.HTTP_404_NOT_FOUND)
    except TransferReason.DoesNotExist:
        return Response({"error": "Transfer reason not found"}, status=status.HTTP_404_NOT_FOUND)
    except DomainError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Map endpoint — GeoJSON FeatureCollection
# ---------------------------------------------------------------------------

@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def active_animals_map(request):
    """GET /api/v1/map/active-animals/ — GeoJSON FeatureCollection for Leaflet."""
    # Get all active ownership records with coordinates
    records = (
        OwnershipRecord.objects
        .filter(status="ACTIVE", start_latitude__isnull=False)
        .select_related("animal", "animal__species", "beneficiary", "beneficiary__barangay")
    )

    features = []
    for rec in records:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    float(rec.start_longitude),
                    float(rec.start_latitude),
                ],
            },
            "properties": {
                "id": rec.animal.id,
                "tag_id": rec.animal.tag_id,
                "species": rec.animal.species.name if rec.animal.species else None,
                "sex": rec.animal.sex,
                "batch_quantity": rec.animal.batch_quantity if rec.animal.is_batch else 1,
                "beneficiary_id": rec.beneficiary.id,
                "beneficiary_name": rec.beneficiary.full_name,
                "barangay": rec.beneficiary.barangay.name if rec.beneficiary.barangay else None,
                "status": rec.animal.current_status,
                "start_date": str(rec.start_date),
                "transfer_type": rec.transfer_type,
            },
        }
        features.append(feature)

    return Response({
        "type": "FeatureCollection",
        "features": features,
    })


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def active_animals_paths(request):
    """GET /api/v1/dispersal/map/active-animals/paths/ — GeoJSON LineStrings for movement polylines."""
    # Get all ownership records with coordinates, grouped by animal
    records = (
        OwnershipRecord.objects
        .filter(start_latitude__isnull=False, start_longitude__isnull=False)
        .select_related("animal", "animal__species")
        .order_by("animal__id", "start_date")
    )

    # Group by animal
    animal_paths = {}
    for rec in records:
        aid = rec.animal.id
        if aid not in animal_paths:
            animal_paths[aid] = {
                "animal_id": aid,
                "tag_id": rec.animal.tag_id,
                "species": rec.animal.species.name if rec.animal.species else None,
                "points": [],
            }
        animal_paths[aid]["points"].append({
            "lat": float(rec.start_latitude),
            "lng": float(rec.start_longitude),
            "date": str(rec.start_date),
            "transfer_type": rec.transfer_type,
        })

    # Build GeoJSON FeatureCollection with LineStrings
    features = []
    for aid, path in animal_paths.items():
        if len(path["points"]) < 2:
            continue  # Need at least 2 points for a line
        coords = [[p["lng"], p["lat"]] for p in path["points"]]
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords,
            },
            "properties": {
                "animal_id": aid,
                "tag_id": path["tag_id"],
                "species": path["species"],
                "points": path["points"],
            },
        }
        features.append(feature)

    return Response({
        "type": "FeatureCollection",
        "features": features,
    })


# ---------------------------------------------------------------------------
# Reports endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def dispersal_summary_view(request):
    """GET /api/v1/reports/dispersal-summary/ — Counts by barangay, species, date range."""
    from django.utils import timezone
    from datetime import timedelta

    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")
    barangay = request.query_params.get("barangay")
    species = request.query_params.get("species")

    qs = OwnershipRecord.objects.select_related(
        "animal", "animal__species", "beneficiary", "beneficiary__barangay",
    )

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
@perm_decorator([IsAuthenticated])
def redispersal_frequency_view(request):
    """GET /api/v1/reports/redispersal-frequency/ — Animals/beneficiaries with most transfers."""
    from livestock.models import Animal

    # Animals with most transfers
    animals = (
        Animal.objects.annotate(
            transfer_count=Count("ownership_records"),
        )
        .filter(transfer_count__gt=1)
        .select_related("species", "current_owner")
        .order_by("-transfer_count")[:20]
    )

    animal_data = [
        {
            "id": a.id,
            "tag_id": a.tag_id,
            "species": a.species.name if a.species else None,
            "current_owner": a.current_owner.full_name if a.current_owner else None,
            "transfer_count": a.transfer_count,
        }
        for a in animals
    ]

    # Beneficiaries with most animals received
    from beneficiaries.models import Beneficiary
    beneficiaries = (
        Beneficiary.objects.annotate(
            total_received=Count("ownership_records"),
        )
        .filter(total_received__gt=1)
        .order_by("-total_received")[:20]
    )

    beneficiary_data = [
        {
            "id": b.id,
            "name": b.full_name,
            "barangay": b.barangay.name if b.barangay else None,
            "total_received": b.total_received,
        }
        for b in beneficiaries
    ]

    return Response({
        "most_transferred_animals": animal_data,
        "most_active_beneficiaries": beneficiary_data,
    })

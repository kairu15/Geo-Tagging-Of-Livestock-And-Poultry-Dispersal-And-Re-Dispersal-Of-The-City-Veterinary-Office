from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes as perm_decorator
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import GeoTag, Caretaker, Custodianship, LocationCheckIn, HandoffReason
from .serializers import (
    GeoTagSerializer, GeoTagListSerializer,
    CaretakerSerializer,
    CustodianshipSerializer, CustodianshipListSerializer,
    LocationCheckInSerializer,
    HandoffReasonSerializer,
    TagAnimalSerializer, HandoffSerializer, CheckInSerializer, RetireTagSerializer,
)
from .services import (
    tag_animal, record_location_checkin, handoff_custodianship,
    retire_tag, get_custody_lineage, get_active_geo_locations, get_custody_trail,
    GeoDomainError,
)
from accounts.permissions import IsOfficerOrAbove, IsReadOnly
from livestock.models import Animal
from beneficiaries.models import Beneficiary


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------

class HandoffReasonViewSet(viewsets.ModelViewSet):
    queryset = HandoffReason.objects.filter(is_active=True)
    serializer_class = HandoffReasonSerializer
    permission_classes = [IsOfficerOrAbove]


class CaretakerViewSet(viewsets.ModelViewSet):
    queryset = Caretaker.objects.select_related("beneficiary", "barangay").all()
    serializer_class = CaretakerSerializer
    permission_classes = [IsOfficerOrAbove]
    filterset_fields = ["caretaker_type", "barangay"]
    search_fields = ["full_name", "contact_number"]
    ordering_fields = ["full_name", "created_at"]


class GeoTagViewSet(viewsets.ModelViewSet):
    queryset = GeoTag.objects.select_related(
        "animal", "animal__species", "tagged_by"
    ).all()
    permission_classes = [IsReadOnly]
    filterset_fields = ["is_active", "tag_type", "animal"]
    search_fields = ["tag_code", "animal__tag_id"]
    ordering_fields = ["tag_code", "date_tagged", "last_checkin"]

    def get_serializer_class(self):
        if self.action == "list":
            return GeoTagListSerializer
        return GeoTagSerializer

    def create(self, request, *args, **kwargs):
        """POST /api/v1/geotagging/tags/ — Tag a new animal."""
        serializer = TagAnimalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            animal = Animal.objects.get(pk=data["animal_id"])

            # Resolve or create caretaker
            caretaker_id = data.get("caretaker_id")
            if caretaker_id:
                caretaker = Caretaker.objects.get(pk=caretaker_id)
            else:
                # Create new caretaker from provided fields
                beneficiary = None
                if data.get("caretaker_type") == "FORMAL_BENEFICIARY":
                    # Try to find beneficiary linked to this animal's current owner
                    if animal.current_owner:
                        beneficiary = animal.current_owner

                caretaker, _ = Caretaker.objects.get_or_create(
                    full_name=data["caretaker_full_name"],
                    defaults={
                        "beneficiary": beneficiary,
                        "contact_number": data.get("caretaker_contact", ""),
                        "barangay_id": data.get("caretaker_barangay_id"),
                        "address_text": data.get("caretaker_address", ""),
                        "caretaker_type": data.get("caretaker_type", "FORMAL_BENEFICIARY"),
                    },
                )

            coordinates = {
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
            }

            geo_tag, custodianship = tag_animal(
                animal=animal,
                tag_type=data["tag_type"],
                tagged_by=request.user,
                initial_caretaker=caretaker,
                coordinates=coordinates,
                intake_condition=data.get("intake_condition", "HEALTHY"),
            )

            return Response(
                GeoTagSerializer(geo_tag).data,
                status=status.HTTP_201_CREATED,
            )

        except Animal.DoesNotExist:
            return Response({"error": "Animal not found"}, status=status.HTTP_404_NOT_FOUND)
        except Caretaker.DoesNotExist:
            return Response({"error": "Caretaker not found"}, status=status.HTTP_404_NOT_FOUND)
        except GeoDomainError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CustodianshipViewSet(viewsets.ModelViewSet):
    queryset = Custodianship.objects.select_related(
        "geo_tag", "geo_tag__animal", "caretaker", "end_reason",
    ).all()
    permission_classes = [IsReadOnly]
    filterset_fields = ["status", "geo_tag"]
    ordering_fields = ["start_date", "end_date", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return CustodianshipListSerializer
        return CustodianshipSerializer


class LocationCheckInViewSet(viewsets.ModelViewSet):
    queryset = LocationCheckIn.objects.select_related(
        "custodianship", "custodianship__geo_tag", "checked_in_by"
    ).all()
    serializer_class = LocationCheckInSerializer
    permission_classes = [IsReadOnly]
    filterset_fields = ["custodianship", "source"]
    ordering_fields = ["checked_in_at"]


# ---------------------------------------------------------------------------
# Custom action endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def tag_lineage_view(request, pk):
    """GET /api/v1/geotagging/tags/{id}/lineage/ — Full custodianship history."""
    try:
        geo_tag = GeoTag.objects.select_related("animal", "animal__species").get(pk=pk)
    except GeoTag.DoesNotExist:
        return Response({"error": "GeoTag not found"}, status=status.HTTP_404_NOT_FOUND)

    lineage = get_custody_lineage(geo_tag)
    return Response({
        "tag_code": geo_tag.tag_code,
        "animal_tag": geo_tag.animal.tag_id,
        "is_active": geo_tag.is_active,
        "lineage": CustodianshipSerializer(lineage, many=True).data,
    })


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def tag_checkins_view(request, pk):
    """GET /api/v1/geotagging/tags/{id}/checkins/ — Check-in history for current custody."""
    try:
        geo_tag = GeoTag.objects.get(pk=pk)
    except GeoTag.DoesNotExist:
        return Response({"error": "GeoTag not found"}, status=status.HTTP_404_NOT_FOUND)

    active_cust = Custodianship.objects.filter(
        geo_tag=geo_tag, status="ACTIVE"
    ).first()

    if not active_cust:
        return Response({"checkins": []})

    checkins = LocationCheckIn.objects.filter(
        custodianship=active_cust
    ).order_by("-checked_in_at")

    return Response({
        "custodianship_id": active_cust.id,
        "checkins": LocationCheckInSerializer(checkins, many=True).data,
    })


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def tag_lookup_view(request, tag_code):
    """GET /api/v1/geotagging/tags/{tag_code}/ — Public-ish lookup by scanned QR code."""
    try:
        geo_tag = GeoTag.objects.select_related(
            "animal", "animal__species", "tagged_by"
        ).get(tag_code=tag_code)
    except GeoTag.DoesNotExist:
        return Response({"error": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)

    # Get current active custodianship
    active_cust = Custodianship.objects.filter(
        geo_tag=geo_tag, status="ACTIVE"
    ).select_related("caretaker", "caretaker__barangay").first()

    data = GeoTagSerializer(geo_tag).data
    if active_cust:
        data["current_custodianship"] = CustodianshipSerializer(active_cust).data
    else:
        data["current_custodianship"] = None

    return Response(data)


@api_view(["POST"])
@perm_decorator([IsOfficerOrAbove])
def checkin_view(request):
    """POST /api/v1/geotagging/checkins/ — Record a location check-in."""
    serializer = CheckInSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        custodianship = Custodianship.objects.get(pk=data["custodianship_id"])

        coordinates = {
            "latitude": data["latitude"],
            "longitude": data["longitude"],
        }

        checkin = record_location_checkin(
            custodianship=custodianship,
            coordinates=coordinates,
            checked_in_by=request.user,
            source=data["source"],
            photo=data.get("photo"),
            notes=data.get("notes", ""),
        )

        return Response(
            LocationCheckInSerializer(checkin).data,
            status=status.HTTP_201_CREATED,
        )

    except Custodianship.DoesNotExist:
        return Response({"error": "Custodianship not found"}, status=status.HTTP_404_NOT_FOUND)
    except GeoDomainError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@perm_decorator([IsOfficerOrAbove])
def handoff_view(request):
    """POST /api/v1/geotagging/handoff/ — Transfer custodianship to a new caretaker."""
    serializer = HandoffSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        geo_tag = GeoTag.objects.get(pk=data["geo_tag_id"])
        end_reason = HandoffReason.objects.get(pk=data["end_reason_id"])

        # Resolve or create caretaker
        caretaker_id = data.get("new_caretaker_id")
        if caretaker_id:
            new_caretaker = Caretaker.objects.get(pk=caretaker_id)
        else:
            new_caretaker, _ = Caretaker.objects.get_or_create(
                full_name=data["caretaker_full_name"],
                defaults={
                    "contact_number": data.get("caretaker_contact", ""),
                    "barangay_id": data.get("caretaker_barangay_id"),
                    "address_text": data.get("caretaker_address", ""),
                    "caretaker_type": data.get("caretaker_type", "INFORMAL_CARETAKER"),
                },
            )

        coordinates = {
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
        }

        new_cust = handoff_custodianship(
            geo_tag=geo_tag,
            new_caretaker=new_caretaker,
            end_reason=end_reason,
            coordinates=coordinates,
            exit_condition=data.get("exit_condition", "HEALTHY"),
            intake_condition=data.get("intake_condition", "HEALTHY"),
        )

        return Response(
            CustodianshipSerializer(new_cust).data,
            status=status.HTTP_201_CREATED,
        )

    except GeoTag.DoesNotExist:
        return Response({"error": "GeoTag not found"}, status=status.HTTP_404_NOT_FOUND)
    except HandoffReason.DoesNotExist:
        return Response({"error": "Handoff reason not found"}, status=status.HTTP_404_NOT_FOUND)
    except Caretaker.DoesNotExist:
        return Response({"error": "Caretaker not found"}, status=status.HTTP_404_NOT_FOUND)
    except GeoDomainError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@perm_decorator([IsOfficerOrAbove])
def retire_tag_view(request, pk):
    """POST /api/v1/geotagging/tags/{id}/retire/ — Retire a geo tag."""
    try:
        geo_tag = GeoTag.objects.get(pk=pk)
    except GeoTag.DoesNotExist:
        return Response({"error": "GeoTag not found"}, status=status.HTTP_404_NOT_FOUND)

    reason_id = request.data.get("reason_id")
    reason = None
    if reason_id:
        try:
            reason = HandoffReason.objects.get(pk=reason_id)
        except HandoffReason.DoesNotExist:
            return Response({"error": "Reason not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        retired = retire_tag(geo_tag, reason=reason)
        return Response(GeoTagSerializer(retired).data)
    except GeoDomainError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Map endpoints — GeoJSON
# ---------------------------------------------------------------------------

@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def active_geo_map_view(request):
    """GET /api/v1/geotagging/map/active/ — GeoJSON of all active custodianships."""
    filters = {}
    if request.query_params.get("species"):
        filters["species"] = request.query_params["species"]
    if request.query_params.get("barangay"):
        filters["barangay"] = request.query_params["barangay"]
    if request.query_params.get("caretaker_type"):
        filters["caretaker_type"] = request.query_params["caretaker_type"]

    geojson = get_active_geo_locations(filters=filters if filters else None)
    return Response(geojson)


@api_view(["GET"])
@perm_decorator([IsAuthenticated])
def custody_trail_view(request, pk):
    """GET /api/v1/geotagging/map/{tag_id}/trail/ — Full movement trail for one animal."""
    try:
        geo_tag = GeoTag.objects.select_related("animal").get(pk=pk)
    except GeoTag.DoesNotExist:
        return Response({"error": "GeoTag not found"}, status=status.HTTP_404_NOT_FOUND)

    trail = get_custody_trail(geo_tag)
    return Response(trail)

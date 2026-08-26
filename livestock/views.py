from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Species, Breed, Animal, HealthRecord
from .serializers import (
    SpeciesSerializer, BreedSerializer,
    AnimalListSerializer, AnimalDetailSerializer,
    AnimalRegistrationSerializer, HealthRecordSerializer,
)
from accounts.permissions import IsOfficerOrAbove, IsReadOnly


class SpeciesViewSet(viewsets.ModelViewSet):
    queryset = Species.objects.all()
    serializer_class = SpeciesSerializer
    permission_classes = [IsReadOnly]


class BreedViewSet(viewsets.ModelViewSet):
    queryset = Breed.objects.select_related("species").all()
    serializer_class = BreedSerializer
    permission_classes = [IsReadOnly]
    filterset_fields = ["species"]


class AnimalViewSet(viewsets.ModelViewSet):
    queryset = Animal.objects.select_related(
        "species", "breed", "current_owner", "current_owner__barangay",
    ).filter(is_archived=False)
    permission_classes = [IsReadOnly]
    filterset_fields = ["species", "current_status", "sex", "is_batch"]
    search_fields = ["tag_id", "color_markings", "current_owner__first_name", "current_owner__last_name"]
    ordering_fields = ["tag_id", "created_at", "current_status"]

    def get_serializer_class(self):
        if self.action == "list":
            return AnimalListSerializer
        if self.action in ("create", "update", "partial_update"):
            return AnimalRegistrationSerializer
        return AnimalDetailSerializer

    @action(detail=True, methods=["get"], permission_classes=[IsReadOnly])
    def history(self, request, pk=None):
        """GET /api/v1/animals/{id}/history/ — full ownership chain."""
        animal = self.get_object()
        from dispersal.services import get_ownership_history
        from dispersal.serializers import OwnershipRecordSerializer
        records = get_ownership_history(animal)
        return Response(OwnershipRecordSerializer(records, many=True).data)

    @action(detail=True, methods=["get"], permission_classes=[IsReadOnly])
    def location_timeline(self, request, pk=None):
        """GET /api/v1/animals/{id}/location-timeline/ — ordered coordinates for map polyline."""
        animal = self.get_object()
        from dispersal.models import OwnershipRecord
        records = OwnershipRecord.objects.filter(
            animal=animal,
            start_latitude__isnull=False,
            start_longitude__isnull=False,
        ).order_by("start_date").values(
            "start_date", "end_date", "start_latitude", "start_longitude",
            "beneficiary__first_name", "beneficiary__last_name",
            "beneficiary__barangay__name",
        )

        timeline = []
        for r in records:
            timeline.append({
                "date": r["start_date"],
                "end_date": r["end_date"],
                "latitude": float(r["start_latitude"]),
                "longitude": float(r["start_longitude"]),
                "beneficiary_name": f"{r['beneficiary__first_name']} {r['beneficiary__last_name']}",
                "barangay": r["beneficiary__barangay__name"],
            })

        return Response({
            "animal_tag": animal.tag_id,
            "timeline": timeline,
        })


class HealthRecordViewSet(viewsets.ModelViewSet):
    queryset = HealthRecord.objects.select_related("animal", "veterinarian").all()
    serializer_class = HealthRecordSerializer
    permission_classes = [IsOfficerOrAbove]
    filterset_fields = ["animal", "record_type"]
    search_fields = ["animal__tag_id", "notes"]

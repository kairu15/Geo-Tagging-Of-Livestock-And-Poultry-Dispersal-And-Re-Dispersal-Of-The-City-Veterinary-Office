from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Beneficiary, Barangay
from .serializers import (
    BeneficiaryListSerializer,
    BeneficiaryDetailSerializer,
    BarangaySerializer,
)
from accounts.permissions import IsOfficerOrAbove, IsReadOnly
from dispersal.services import get_beneficiary_current_holdings, get_beneficiary_full_history


class NoPagination(PageNumberPagination):
    page_size = None


class BarangayViewSet(viewsets.ModelViewSet):
    queryset = Barangay.objects.all()
    serializer_class = BarangaySerializer
    permission_classes = [IsReadOnly]
    pagination_class = NoPagination
    search_fields = ["name", "city_municipality"]


class BeneficiaryViewSet(viewsets.ModelViewSet):
    queryset = Beneficiary.objects.select_related("barangay", "registered_by").filter(
        is_archived=False
    )
    permission_classes = [IsReadOnly]
    filterset_fields = ["barangay", "is_active_beneficiary", "household_head"]
    search_fields = ["first_name", "last_name", "contact_number"]
    ordering_fields = ["last_name", "first_name", "date_registered"]

    def get_serializer_class(self):
        if self.action == "list":
            return BeneficiaryListSerializer
        return BeneficiaryDetailSerializer

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[IsReadOnly])
    def current_holdings(self, request, pk=None):
        """GET /api/v1/beneficiaries/{id}/current-holdings/"""
        beneficiary = self.get_object()
        animals = get_beneficiary_current_holdings(beneficiary)
        from livestock.serializers import AnimalListSerializer
        return Response(AnimalListSerializer(animals, many=True).data)

    @action(detail=True, methods=["get"], permission_classes=[IsReadOnly])
    def full_history(self, request, pk=None):
        """GET /api/v1/beneficiaries/{id}/full-history/"""
        beneficiary = self.get_object()
        records = get_beneficiary_full_history(beneficiary)
        from dispersal.serializers import OwnershipRecordSerializer
        return Response(OwnershipRecordSerializer(records, many=True).data)

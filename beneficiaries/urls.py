from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BeneficiaryViewSet, BarangayViewSet

router = DefaultRouter()
router.register(r"beneficiaries", BeneficiaryViewSet, basename="beneficiary")
router.register(r"barangays", BarangayViewSet, basename="barangay")

urlpatterns = [
    path("", include(router.urls)),
]

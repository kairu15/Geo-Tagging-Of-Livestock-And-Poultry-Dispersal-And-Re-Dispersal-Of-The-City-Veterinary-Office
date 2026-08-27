from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DiseaseTypeViewSet,
    HealthEventViewSet,
    QuarantineZoneViewSet,
    submit_disease_report,
    radius_search,
    active_quarantine_zones,
    check_quarantine_conflict,
)

router = DefaultRouter()
router.register(r"disease-types", DiseaseTypeViewSet, basename="disease-type")
router.register(r"events", HealthEventViewSet, basename="health-event")
router.register(r"quarantine-zones", QuarantineZoneViewSet, basename="quarantine-zone")

urlpatterns = [
    # Custom endpoints (MUST come before router to avoid pk conflicts)
    path("report/", submit_disease_report, name="submit-disease-report"),
    path("radius-search/", radius_search, name="radius-search"),
    path("quarantine-zones/active/", active_quarantine_zones, name="active-quarantine-zones"),
    path("quarantine-check/", check_quarantine_conflict, name="quarantine-check"),
    # Router (must come last)
    path("", include(router.urls)),
]

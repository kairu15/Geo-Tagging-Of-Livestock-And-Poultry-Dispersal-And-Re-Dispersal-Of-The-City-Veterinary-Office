from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OwnershipRecordViewSet, TransferReasonViewSet,
    ReDispersalRequestViewSet,
    disperse_view, redisperse_view, return_to_cvo_view,
    active_animals_map, active_animals_paths,
    dispersal_summary_view, redispersal_frequency_view,
)

router = DefaultRouter()
router.register(r"records", OwnershipRecordViewSet, basename="ownership-record")
router.register(r"transfer-reasons", TransferReasonViewSet, basename="transfer-reason")
router.register(r"redispersal-requests", ReDispersalRequestViewSet, basename="redispersal-request")

urlpatterns = [
    path("", include(router.urls)),
    # Custom action endpoints
    path("disperse/", disperse_view, name="disperse-animal"),
    path("redisperse/", redisperse_view, name="redisperse-animal"),
    path("return-to-cvo/", return_to_cvo_view, name="return-to-cvo"),
    # Map endpoint
    path("map/active-animals/", active_animals_map, name="active-animals-map"),
    path("map/active-animals/paths/", active_animals_paths, name="active-animals-paths"),
    # Reports
    path("reports/dispersal-summary/", dispersal_summary_view, name="dispersal-summary"),
    path("reports/redispersal-frequency/", redispersal_frequency_view, name="redispersal-frequency"),
]

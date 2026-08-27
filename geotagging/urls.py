from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GeoTagViewSet, CustodianshipViewSet, LocationCheckInViewSet,
    CaretakerViewSet, HandoffReasonViewSet,
    tag_lineage_view, tag_checkins_view, tag_lookup_view,
    checkin_view, handoff_view, retire_tag_view,
    active_geo_map_view, custody_trail_view,
    review_checkin_view,
)

router = DefaultRouter()
router.register(r"tags", GeoTagViewSet, basename="geotag")
router.register(r"custodianships", CustodianshipViewSet, basename="custodianship")
router.register(r"checkins", LocationCheckInViewSet, basename="location-checkin")
router.register(r"caretakers", CaretakerViewSet, basename="caretaker")
router.register(r"handoff-reasons", HandoffReasonViewSet, basename="handoff-reason")

urlpatterns = [
    # Custom action endpoints (MUST come before router to avoid pk conflicts)
    path("checkins/create/", checkin_view, name="checkin-create"),
    path("checkins/<int:pk>/review/", review_checkin_view, name="checkin-review"),
    path("handoff/", handoff_view, name="handoff"),

    # Map endpoints
    path("map/active/", active_geo_map_view, name="active-geo-map"),
    path("map/<int:pk>/trail/", custody_trail_view, name="custody-trail"),

    # Tag-specific endpoints
    path("tags/<int:pk>/lineage/", tag_lineage_view, name="tag-lineage"),
    path("tags/<int:pk>/checkins/", tag_checkins_view, name="tag-checkins"),
    path("tags/<str:tag_code>/lookup/", tag_lookup_view, name="tag-lookup"),
    path("tags/<int:pk>/retire/", retire_tag_view, name="tag-retire"),

    # Router (must come last)
    path("", include(router.urls)),
]

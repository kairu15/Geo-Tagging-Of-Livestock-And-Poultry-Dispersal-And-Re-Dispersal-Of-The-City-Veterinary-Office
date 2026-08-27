"""
URL configuration for CVO Geo-Tagging Livestock Dispersal System.
All API endpoints are versioned under /api/v1/.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # API v1 — accounts (auth + user management)
    path("api/v1/auth/", include("accounts.urls")),

    # API v1 — beneficiaries & barangays
    path("api/v1/", include("beneficiaries.urls")),

    # API v1 — livestock
    path("api/v1/", include("livestock.urls")),

    # API v1 — dispersal core (records, transfer reasons, custom actions)
    path("api/v1/dispersal/", include("dispersal.urls")),

    # API v1 — geotagging (custodianship & location tracking)
    path("api/v1/geotagging/", include("geotagging.urls")),

    # API v1 — reports (separate app for clean separation)
    path("api/v1/reports/", include("reports.urls")),

    # API v1 — health/disease surveillance
    path("api/v1/health/", include("health.urls")),

    # OpenAPI schema + Swagger UI
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

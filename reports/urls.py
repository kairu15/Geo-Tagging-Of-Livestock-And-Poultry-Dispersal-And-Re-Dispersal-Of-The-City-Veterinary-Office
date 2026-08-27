from django.urls import path
from .views import (
    dispersal_summary_view,
    redispersal_frequency_view,
    dispersal_csv_export,
    overdue_offspring_view,
    public_dashboard,
)

urlpatterns = [
    path("dispersal-summary/", dispersal_summary_view, name="dispersal-summary"),
    path("redispersal-frequency/", redispersal_frequency_view, name="redispersal-frequency"),
    path("dispersal-export/", dispersal_csv_export, name="dispersal-csv-export"),
    path("overdue-offspring/", overdue_offspring_view, name="overdue-offspring"),
    # Public dashboard (no auth required)
    path("public/dashboard/", public_dashboard, name="public-dashboard"),
]

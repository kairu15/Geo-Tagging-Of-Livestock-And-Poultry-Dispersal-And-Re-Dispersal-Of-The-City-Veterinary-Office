from django.urls import path
from .views import dispersal_summary_view, redispersal_frequency_view, dispersal_csv_export

urlpatterns = [
    path("dispersal-summary/", dispersal_summary_view, name="dispersal-summary"),
    path("redispersal-frequency/", redispersal_frequency_view, name="redispersal-frequency"),
    path("dispersal-export/", dispersal_csv_export, name="dispersal-csv-export"),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpeciesViewSet, BreedViewSet, AnimalViewSet, HealthRecordViewSet

router = DefaultRouter()
router.register(r"species", SpeciesViewSet, basename="species")
router.register(r"breeds", BreedViewSet, basename="breed")
router.register(r"animals", AnimalViewSet, basename="animal")
router.register(r"health-records", HealthRecordViewSet, basename="health-record")

urlpatterns = [
    path("", include(router.urls)),
]

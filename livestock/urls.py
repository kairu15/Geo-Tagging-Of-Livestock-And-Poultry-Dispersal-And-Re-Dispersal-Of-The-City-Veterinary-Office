from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SpeciesViewSet, BreedViewSet, AnimalViewSet, HealthRecordViewSet, public_animal_qr, animal_offspring

router = DefaultRouter()
router.register(r"species", SpeciesViewSet, basename="species")
router.register(r"breeds", BreedViewSet, basename="breed")
router.register(r"animals", AnimalViewSet, basename="animal")
router.register(r"health-records", HealthRecordViewSet, basename="health-record")

urlpatterns = [
    path("public/qr/<str:tag_id>/", public_animal_qr, name="public-animal-qr"),
    path("animals/<int:pk>/offspring/", animal_offspring, name="animal-offspring"),
    path("animals/offspring/", animal_offspring, name="create-offspring"),
    path("", include(router.urls)),
]

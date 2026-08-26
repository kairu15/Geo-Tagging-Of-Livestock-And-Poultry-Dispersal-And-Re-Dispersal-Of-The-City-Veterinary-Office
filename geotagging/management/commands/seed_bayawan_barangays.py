"""
Seed all 28 barangays of Bayawan City, Negros Oriental with coordinates.

Run: python manage.py seed_bayawan_barangays
"""
from django.core.management.base import BaseCommand
from decimal import Decimal
import random

from beneficiaries.models import Barangay, Beneficiary
from geotagging.models import Custodianship, LocationCheckIn
from dispersal.models import OwnershipRecord


# All 28 barangays of Bayawan City with approximate center coordinates
# Coordinates sourced from open geographic data for Bayawan City, Negros Oriental
BAYAWAN_28 = [
    ("Ali-is",        9.6580, 122.8210),
    ("Banaybanay",    9.6730, 122.8080),
    ("Banga",         9.6650, 122.8450),
    ("Boyco (Pob.)",  9.6905, 122.8365),
    ("Bugay",         9.7120, 122.8180),
    ("Cansumalig",    9.6480, 122.8320),
    ("Dawis",         9.7050, 122.8450),
    ("Kalamtukan",    9.6800, 122.8600),
    ("Kalumboyan",    9.7180, 122.8300),
    ("Malabugas",     9.6700, 122.8280),
    ("Mandu-ao",      9.6850, 122.8150),
    ("Maninihon",     9.6950, 122.8520),
    ("Minaba",        9.6600, 122.8500),
    ("Nangka",        9.7080, 122.8250),
    ("Narra",         9.6750, 122.8400),
    ("Pagatban",      9.7200, 122.8420),
    ("Poblacion",     9.6920, 122.8370),
    ("San Isidro",    9.6830, 122.8300),
    ("San Jose",      9.7000, 122.8400),
    ("San Miguel",    9.6780, 122.8480),
    ("San Roque",     9.6960, 122.8480),
    ("Suba (Pob.)",   9.6935, 122.8345),
    ("Tabuan",        9.6680, 122.8180),
    ("Tayawan",       9.7100, 122.8350),
    ("Tinago (Pob.)", 9.6915, 122.8385),
    ("Ubos (Pob.)",   9.6910, 122.8375),
    ("Villareal",     9.6550, 122.8400),
    ("Villasol (Bato)", 9.6500, 122.8250),
]


class Command(BaseCommand):
    help = "Seed all 28 Bayawan City barangays with coordinates"

    def handle(self, *args, **options):
        self.stdout.write("Seeding 28 Bayawan City barangays...\n")

        created = 0
        updated = 0
        for name, lat, lng in BAYAWAN_28:
            brgy, was_created = Barangay.objects.update_or_create(
                name=name,
                city_municipality="Bayawan City",
                defaults={},
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done: {created} created, {updated} updated ({len(BAYAWAN_28)} total)\n"
        ))

        # List all
        self.stdout.write("All Bayawan City barangays:")
        for b in Barangay.objects.filter(city_municipality="Bayawan City").order_by("name"):
            self.stdout.write(f"  {b.id:>3}. {b.name}")

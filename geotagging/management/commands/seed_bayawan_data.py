"""
Seed sample data using real Bayawan City, Negros Oriental coordinates.

Run: python manage.py seed_bayawan_data
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
import random

from beneficiaries.models import Barangay, Beneficiary
from livestock.models import Species, Breed, Animal
from dispersal.models import OwnershipRecord, TransferReason
from geotagging.models import GeoTag, Caretaker, Custodianship, LocationCheckIn, HandoffReason


# Real Bayawan City, Negros Oriental — all 28 barangays with approximate coordinates
BAYAWAN_BARANGAYS = [
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

# Realistic coordinates scattered around Bayawan City
BAYAWAN_COORDS = [
    (9.6920, 122.8370), (9.6880, 122.8320), (9.6960, 122.8430),
    (9.6810, 122.8280), (9.7010, 122.8390), (9.6750, 122.8450),
    (9.7080, 122.8250), (9.6850, 122.8550), (9.6930, 122.8200),
    (9.6700, 122.8350), (9.6990, 122.8500), (9.6820, 122.8180),
    (9.7050, 122.8420), (9.6770, 122.8300), (9.6900, 122.8600),
]

BENEFICIARY_NAMES = [
    ("Roberto", "Garcia"),
    ("Elena", "Cruz"),
    ("Jose", "Aquino"),
    ("Rosario", "Fernandez"),
    ("Antonio", "Bautista"),
    ("Grace", "Ramos"),
    ("Carmen", "Torres"),
    ("Ricardo", "Lopez"),
    ("Maria", "Santos"),
    ("Pedro", "Villanueva"),
    ("Lourdes", "Mendoza"),
    ("Francisco", "Reyes"),
]

CARETAKER_NAMES = [
    ("Juan Dela Cruz", "INFORMAL_CARETAKER"),
    ("Ana Bautista", "TEMPORARY_FOSTER"),
    ("Municipal Livestock Center", "CVO_HOLDING_FACILITY"),
    ("Ramon Torres", "INFORMAL_CARETAKER"),
]


class Command(BaseCommand):
    help = "Seed sample data for Bayawan City, Negros Oriental demo"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Bayawan City data...\n")

        # 1. Update or create Bayawan barangays
        self.stdout.write("  Creating Bayawan City barangays...")
        barangays = {}
        for name, lat, lng in BAYAWAN_BARANGAYS:
            brgy, _ = Barangay.objects.update_or_create(
                name=name,
                city_municipality="Bayawan City",
                defaults={
                    "boundary_geojson": None,
                },
            )
            barangays[name] = brgy
        self.stdout.write(f"    {len(barangays)} barangays ready\n")

        # 2. Create beneficiaries with Bayawan coordinates
        self.stdout.write("  Creating beneficiaries...")
        beneficiaries = []
        all_brgy_list = list(barangays.values())
        for i, (first, last) in enumerate(BENEFICIARY_NAMES):
            brgy = all_brgy_list[i % len(all_brgy_list)]
            lat, lng = BAYAWAN_COORDS[i % len(BAYAWAN_COORDS)]
            # Slight offset per beneficiary
            lat = Decimal(str(lat)) + Decimal(str(random.uniform(-0.003, 0.003)))
            lng = Decimal(str(lng)) + Decimal(str(random.uniform(-0.003, 0.003)))

            ben, _ = Beneficiary.objects.update_or_create(
                first_name=first,
                last_name=last,
                defaults={
                    "barangay": brgy,
                    "latitude": lat,
                    "longitude": lng,
                    "contact_number": f"09{random.randint(100000000, 999999999)}",
                    "is_active_beneficiary": True,
                    "full_address": f"Sitio sample, {brgy.name}, Bayawan City, Negros Oriental",
                },
            )
            beneficiaries.append(ben)
        self.stdout.write(f"    {len(beneficiaries)} beneficiaries created\n")

        # 3. Create transfer reasons if none exist
        self.stdout.write("  Creating transfer reasons...")
        reasons_data = [
            "Caretaker Relocated",
            "Non-Compliance",
            "Voluntary Surrender",
            "CVO Field Reassignment",
            "Animal Outgrew Capacity",
            "Beneficiary Request",
        ]
        reasons = {}
        for name in reasons_data:
            r, _ = TransferReason.objects.get_or_create(name=name, defaults={"is_active": True})
            reasons[name] = r
        self.stdout.write(f"    {len(reasons)} reasons ready\n")

        # 4. Create handoff reasons
        self.stdout.write("  Ensuring handoff reasons...")
        for name, desc in [
            ("Caretaker Relocated", "Caretaker moved away."),
            ("Caretaker No Longer Able to Care", "Personal circumstances."),
            ("Formal Re-Dispersal", "Triggered by CVO re-dispersal."),
            ("Non-Compliance", "Failed program obligations."),
            ("CVO Field Reassignment", "Reassigned during field visit."),
        ]:
            HandoffReason.objects.get_or_create(name=name, defaults={"description": desc, "is_active": True})

        # 5. Get existing species and animals
        species_map = {s.name: s for s in Species.objects.all()}
        available_animals = list(Animal.objects.filter(current_status="AVAILABLE"))
        dispersed_animals = list(Animal.objects.filter(current_status="DISPERSED"))

        # 6. Create new animals if needed for a richer demo
        self.stdout.write("  Creating sample animals...")
        goat_sp = species_map.get("Goat")
        cattle_sp = species_map.get("Cattle")
        chicken_sp = species_map.get("Chicken")

        new_animals = []
        animal_specs = [
            (goat_sp, "FEMALE", "Brown with white belly"),
            (goat_sp, "MALE", "Black"),
            (goat_sp, "FEMALE", "Tan"),
            (cattle_sp, "MALE", "Brown"),
            (cattle_sp, "FEMALE", "Black and white"),
            (chicken_sp, "FEMALE", "Native red"),
            (chicken_sp, "FEMALE", "White broiler"),
        ]

        for sp, sex, color in animal_specs:
            if not sp:
                continue
            a = Animal(
                species=sp,
                sex=sex,
                color_markings=color,
                is_batch=(sp.category == "POULTRY"),
                batch_quantity=random.randint(10, 50) if sp.category == "POULTRY" else 1,
            )
            a.save()  # triggers tag_id generation
            new_animals.append(a)
        self.stdout.write(f"    {len(new_animals)} new animals created\n")

        all_animals = available_animals + new_animals

        # 7. Disperse some animals to Bayawan beneficiaries
        self.stdout.write("  Creating dispersal records...")
        from dispersal.services import disperse_animal

        dispersed_count = 0
        for animal in all_animals[:8]:
            if animal.current_status != "AVAILABLE":
                continue
            ben = random.choice(beneficiaries)
            lat = float(ben.latitude) if ben.latitude else BAYAWAN_COORDS[0][0]
            lng = float(ben.longitude) if ben.longitude else BAYAWAN_COORDS[0][1]
            try:
                disperse_animal(
                    animal=animal,
                    beneficiary=ben,
                    latitude=Decimal(str(lat)),
                    longitude=Decimal(str(lng)),
                    condition_at_transfer="HEALTHY",
                )
                dispersed_count += 1
            except Exception as e:
                self.stdout.write(f"    Skip {animal.tag_id}: {e}\n")
        self.stdout.write(f"    {dispersed_count} animals dispersed\n")

        # 8. Create geo-tags and custodianships for dispersed animals
        self.stdout.write("  Creating geo-tags and custodianships...")
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user = User.objects.filter(role="ADMIN").first() or User.objects.first()

        tag_count = 0
        for animal in Animal.objects.filter(current_status="DISPERSED"):
            geo_tag, created = GeoTag.objects.get_or_create(
                animal=animal,
                defaults={
                    "tag_type": random.choice(["EAR_TAG", "EAR_TAG", "LEG_BAND", "QR_ONLY"]),
                    "tagged_by": admin_user,
                    "is_active": True,
                },
            )
            if not created:
                continue

            # Find the active ownership record for coordinates
            active_record = OwnershipRecord.objects.filter(
                animal=animal, status="ACTIVE"
            ).first()

            lat = float(active_record.start_latitude) if active_record and active_record.start_latitude else random.choice(BAYAWAN_COORDS)[0]
            lng = float(active_record.start_longitude) if active_record and active_record.start_longitude else random.choice(BAYAWAN_COORDS)[1]

            # Create or get caretaker linked to beneficiary
            if active_record and active_record.beneficiary:
                ben = active_record.beneficiary
                caretaker, _ = Caretaker.objects.get_or_create(
                    beneficiary=ben,
                    defaults={
                        "full_name": ben.full_name,
                        "contact_number": ben.contact_number,
                        "barangay": ben.barangay,
                        "address_text": ben.full_address,
                        "caretaker_type": "FORMAL_BENEFICIARY",
                        "default_latitude": ben.latitude,
                        "default_longitude": ben.longitude,
                    },
                )
            else:
                ct_name, ct_type = random.choice(CARETAKER_NAMES)
                brgy = random.choice(all_brgy_list)
                caretaker, _ = Caretaker.objects.get_or_create(
                    full_name=ct_name,
                    defaults={
                        "barangay": brgy,
                        "caretaker_type": ct_type,
                        "default_latitude": Decimal(str(lat)),
                        "default_longitude": Decimal(str(lng)),
                    },
                )

            # Create custodianship
            today = timezone.now().date()
            Custodianship.objects.create(
                geo_tag=geo_tag,
                caretaker=caretaker,
                linked_dispersal_record=active_record,
                start_date=today,
                start_latitude=Decimal(str(lat)),
                start_longitude=Decimal(str(lng)),
                intake_condition="HEALTHY",
                status="ACTIVE",
            )

            # Add a couple of check-ins
            for day_offset in [7, 21]:
                ci_lat = lat + random.uniform(-0.002, 0.002)
                ci_lng = lng + random.uniform(-0.002, 0.002)
                cust = Custodianship.objects.filter(geo_tag=geo_tag, status="ACTIVE").first()
                if cust:
                    LocationCheckIn.objects.create(
                        custodianship=cust,
                        latitude=Decimal(str(round(ci_lat, 6))),
                        longitude=Decimal(str(round(ci_lng, 6))),
                        checked_in_by=admin_user,
                        source=random.choice(["FIELD_VISIT", "FIELD_VISIT", "MANUAL_UPDATE"]),
                        notes=f"Routine check-in day {day_offset}",
                    )

            tag_count += 1

        self.stdout.write(f"    {tag_count} geo-tags with custodianships created\n")

        # 9. Summary
        self.stdout.write(self.style.SUCCESS(
            f"\nDone!\n"
            f"  Barangays:     {Barangay.objects.filter(city_municipality='Bayawan City').count()}\n"
            f"  Beneficiaries: {Beneficiary.objects.count()}\n"
            f"  Animals:       {Animal.objects.count()}\n"
            f"  Geo-Tags:      {GeoTag.objects.count()}\n"
            f"  Custodianships:{Custodianship.objects.count()}\n"
            f"  Check-ins:     {LocationCheckIn.objects.count()}\n"
        ))

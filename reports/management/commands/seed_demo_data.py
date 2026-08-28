"""
Management command to populate demo data for the CVO livestock dispersal system.

Creates realistic data including:
- Barangays
- Species and breeds
- Transfer reasons
- Users (Admin, Officer, Supervisor, Coordinator)
- Beneficiaries with geo-coordinates
- Animals (various species, some batch poultry)
- Ownership records forming multi-hop re-dispersal chains

Provisioning behaviour
----------------------
* **Production** (DEBUG=False): each user receives a securely generated random
  password printed once to the console.  ``must_change_password`` is set so
  the user is forced to pick a real password on first login.
* **Development** (DEBUG=True or ``--dev-only``): known throwaway passwords
  are used so local setup stays fast.

Usage
-----
    # Production — prints random passwords
    python manage.py seed_demo_data

    # Development — known throwaway passwords
    python manage.py seed_demo_data --dev-only
    DJANGO_DEBUG=True python manage.py seed_demo_data
"""
import random
import secrets
import string
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from beneficiaries.models import Barangay, Beneficiary
from livestock.models import Species, Breed, Animal
from dispersal.models import OwnershipRecord, TransferReason
from dispersal.services import disperse_animal, redisperse_animal

User = get_user_model()


def _generate_password(length: int = 16) -> str:
    """Return a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    password += [secrets.choice(alphabet) for _ in range(length - len(password))]
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


# Known throwaway passwords used ONLY in local development.
_DEV_PASSWORDS = {
    "admin": "admin123",
    "dr.santos": "officer123",
    "supervisor.reyes": "super123",
    "coord.delaCruz": "coord123",
}


class Command(BaseCommand):
    help = "Seed demo data for the CVO livestock dispersal system"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dev-only",
            action="store_true",
            help="Use known throwaway dev passwords (required when DEBUG is False)",
        )

    def handle(self, *args, **options):
        dev_only = options["dev_only"]
        use_dev_passwords = dev_only or settings.DEBUG

        if not use_dev_passwords and not settings.DEBUG:
            self.stderr.write(
                self.style.ERROR(
                    "ERROR: In production (DEBUG=False), you must use either\n"
                    "  --dev-only  to explicitly opt into known dev passwords, or\n"
                    "  omit the flag to generate secure random passwords.\n"
                )
            )
            return

        self.stdout.write("Seeding demo data...")

        # -------------------------------------------------------------------
        # 1. Barangays
        # -------------------------------------------------------------------
        barangays_data = [
            ("Poblacion", "Municipality of Livestock"),
            ("San Isidro", "Municipality of Livestock"),
            ("San Roque", "Municipality of Livestock"),
            ("Bagong Silang", "Municipality of Livestock"),
            ("Maligaya", "Municipality of Livestock"),
            ("Talipapa", "Municipality of Livestock"),
            ("Sta. Cruz", "Municipality of Livestock"),
            ("Villa Nueva", "Municipality of Livestock"),
        ]
        barangays = {}
        for name, city in barangays_data:
            brgy, _ = Barangay.objects.get_or_create(name=name, city_municipality=city)
            barangays[name] = brgy
        self.stdout.write(f"  Created {len(barangays)} barangays")

        # -------------------------------------------------------------------
        # 2. Species & Breeds
        # -------------------------------------------------------------------
        species_data = {
            "Goat": ("LIVESTOCK", ["Boer", "Saanen", "Local", "Anglo-Nubian"]),
            "Cattle": ("LIVESTOCK", ["Native", "Brahman", "Crossbreed"]),
            "Swine": ("LIVESTOCK", ["Large White", "Landrace", "Duroc", "Native"]),
            "Chicken": ("POULTRY", ["Native", "Hybrid", "Layers", "Broiler"]),
            "Duck": ("POULTRY", ["Local", "Pekin", "Runner"]),
        }
        species_map = {}
        for sp_name, (category, breeds) in species_data.items():
            sp, _ = Species.objects.get_or_create(name=sp_name, defaults={"category": category})
            species_map[sp_name] = sp
            for breed_name in breeds:
                Breed.objects.get_or_create(species=sp, name=breed_name)
        self.stdout.write(f"  Created {len(species_map)} species with breeds")

        # -------------------------------------------------------------------
        # 3. Transfer Reasons
        # -------------------------------------------------------------------
        reasons_data = [
            "Owner Relocated",
            "Owner Deceased",
            "Non-Compliance with Care Agreement",
            "Voluntary Return",
            "Multiplication Obligation Fulfilled",
            "Animal Health Issue",
            "Beneficiary Request",
            "Program Violation",
            "Animal Reassignment",
            "Death of Animal",
        ]
        reasons = {}
        for r in reasons_data:
            obj, _ = TransferReason.objects.get_or_create(name=r)
            reasons[r] = obj
        self.stdout.write(f"  Created {len(reasons)} transfer reasons")

        # -------------------------------------------------------------------
        # 4. Users
        # -------------------------------------------------------------------
        credentials = []  # (username, password, role) tuples to print at the end

        # --- Admin ---
        admin_pw = (
            _DEV_PASSWORDS["admin"] if use_dev_passwords else _generate_password()
        )
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "first_name": "System",
                "last_name": "Administrator",
                "role": "ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "must_change_password": not use_dev_passwords,
            },
        )
        admin_user.set_password(admin_pw)
        admin_user.must_change_password = not use_dev_passwords
        admin_user.save()
        credentials.append(("admin", admin_pw, "ADMIN"))

        # --- Officer ---
        officer_pw = (
            _DEV_PASSWORDS["dr.santos"] if use_dev_passwords else _generate_password()
        )
        officer1, created = User.objects.get_or_create(
            username="dr.santos",
            defaults={
                "first_name": "Maria",
                "last_name": "Santos",
                "role": "OFFICER",
                "contact_number": "09171234567",
                "assigned_barangay": barangays["Poblacion"],
                "must_change_password": not use_dev_passwords,
            },
        )
        officer1.set_password(officer_pw)
        officer1.must_change_password = not use_dev_passwords
        officer1.save()
        credentials.append(("dr.santos", officer_pw, "OFFICER"))

        # --- Supervisor ---
        supervisor_pw = (
            _DEV_PASSWORDS["supervisor.reyes"]
            if use_dev_passwords
            else _generate_password()
        )
        supervisor1, created = User.objects.get_or_create(
            username="supervisor.reyes",
            defaults={
                "first_name": "Juan",
                "last_name": "Reyes",
                "role": "SUPERVISOR",
                "contact_number": "09181234567",
                "must_change_password": not use_dev_passwords,
            },
        )
        supervisor1.set_password(supervisor_pw)
        supervisor1.must_change_password = not use_dev_passwords
        supervisor1.save()
        credentials.append(("supervisor.reyes", supervisor_pw, "SUPERVISOR"))

        # --- Coordinator (NEW) ---
        coordinator_pw = (
            _DEV_PASSWORDS["coord.delaCruz"]
            if use_dev_passwords
            else _generate_password()
        )
        coordinator1, created = User.objects.get_or_create(
            username="coord.delaCruz",
            defaults={
                "first_name": "Liza",
                "last_name": "Dela Cruz",
                "role": "COORDINATOR",
                "contact_number": "09191234567",
                "assigned_barangay": barangays["San Isidro"],
                "must_change_password": not use_dev_passwords,
            },
        )
        coordinator1.set_password(coordinator_pw)
        coordinator1.must_change_password = not use_dev_passwords
        coordinator1.save()
        credentials.append(("coord.delaCruz", coordinator_pw, "COORDINATOR"))

        self.stdout.write(
            f"  Created 4 users (admin, officer, supervisor, coordinator)"
        )

        # -------------------------------------------------------------------
        # 5. Beneficiaries
        # -------------------------------------------------------------------
        # Coordinates around a fictional Philippine municipality (~14.0°N, 121.0°E)
        base_lat, base_lng = 14.0, 121.0
        beneficiaries_data = [
            ("Roberto", "", "Garcia", "Poblacion", True, "Farming"),
            ("Elena", "M.", "Cruz", "San Isidro", True, "Livestock"),
            ("Jose", "", "Aquino", "San Roque", True, "Farming"),
            ("Maria", "T.", "Villanueva", "Bagong Silang", True, "Mixed Farming"),
            ("Pedro", "", "Mendoza", "Maligaya", True, "Poultry"),
            ("Rosario", "L.", "Fernandez", "Talipapa", True, "Farming"),
            ("Antonio", "", "Bautista", "Sta. Cruz", True, "Livestock"),
            ("Carmen", "", "Torres", "Villa Nueva", True, "Mixed Farming"),
            ("Ricardo", "P.", "Lopez", "Poblacion", True, "Fishing & Farming"),
            ("Grace", "", "Ramos", "San Isidro", True, "Poultry"),
        ]

        beneficiaries = []
        for i, (fn, mn, ln, brgy, hh, lt) in enumerate(beneficiaries_data):
            lat = base_lat + random.uniform(-0.05, 0.05)
            lng = base_lng + random.uniform(-0.05, 0.05)
            b, _ = Beneficiary.objects.get_or_create(
                first_name=fn,
                last_name=ln,
                defaults={
                    "middle_name": mn,
                    "barangay": barangays[brgy],
                    "contact_number": f"091710000{i+1:02d}",
                    "household_head": hh,
                    "livelihood_type": lt,
                    "is_active_beneficiary": True,
                    "registered_by": admin_user,
                    "latitude": lat,
                    "longitude": lng,
                },
            )
            beneficiaries.append(b)
        self.stdout.write(f"  Created {len(beneficiaries)} beneficiaries")

        # -------------------------------------------------------------------
        # 6. Animals
        # -------------------------------------------------------------------
        animals_data = [
            # (species_name, sex, color, source, is_batch, batch_qty)
            ("Goat", "FEMALE", "Brown with white patches", "DA-RFO donation", False, 1),
            ("Goat", "MALE", "Black", "DA-RFO donation", False, 1),
            ("Goat", "FEMALE", "White", "LGU-purchased", False, 1),
            ("Cattle", "FEMALE", "Brown", "DA-RFO donation", False, 1),
            ("Cattle", "MALE", "Black and white", "LGU-purchased", False, 1),
            ("Swine", "FEMALE", "Pink", "DA-RFO donation", False, 1),
            ("Swine", "MALE", "Spotted black/white", "LGU-purchased", False, 1),
            ("Swine", "FEMALE", "Pink", "DA-RFO donation", False, 1),
            ("Chicken", "FEMALE", "Mixed", "LGU-purchased", True, 50),
            ("Chicken", "FEMALE", "Native brown", "DA-RFO donation", True, 30),
            ("Duck", "FEMALE", "White", "LGU-purchased", True, 25),
            ("Goat", "FEMALE", "Tan", "Confiscated", False, 1),
            ("Cattle", "FEMALE", "Red-brown", "DA-RFO donation", False, 1),
        ]

        animals = []
        for sp_name, sex, color, source, is_batch, batch_qty in animals_data:
            sp = species_map[sp_name]
            breed = None
            breeds = list(Breed.objects.filter(species=sp))
            if breeds:
                breed = random.choice(breeds)

            a = Animal(
                species=sp,
                breed=breed,
                sex=sex,
                color_markings=color,
                source=source,
                is_batch=is_batch,
                batch_quantity=batch_qty,
                weight_kg=random.uniform(5, 50) if sp_name in ("Goat", "Swine") else None,
            )
            a.save()  # triggers tag_id generation
            animals.append(a)
        self.stdout.write(f"  Created {len(animals)} animals")

        # -------------------------------------------------------------------
        # 7. Ownership Records — create multi-hop chains
        # -------------------------------------------------------------------
        today = date.today()

        # Chain 1: Animal 0 (Goat) → Beneficiary 0 → Beneficiary 1 (re-dispersal)
        disperse_animal(
            animal=animals[0],
            beneficiary=beneficiaries[0],
            latitude=beneficiaries[0].latitude,
            longitude=beneficiaries[0].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=365),
        )

        redisperse_animal(
            animal=animals[0],
            new_beneficiary=beneficiaries[1],
            latitude=beneficiaries[1].latitude,
            longitude=beneficiaries[1].longitude,
            end_reason=reasons["Owner Relocated"],
            processed_by=officer1,
            remarks="Beneficiary Garcia relocated to another municipality.",
            start_date=today - timedelta(days=180),
        )

        # Chain 2: Animal 1 (Goat) → Beneficiary 2 → Beneficiary 3 → Beneficiary 4
        disperse_animal(
            animal=animals[1],
            beneficiary=beneficiaries[2],
            latitude=beneficiaries[2].latitude,
            longitude=beneficiaries[2].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=500),
        )

        redisperse_animal(
            animal=animals[1],
            new_beneficiary=beneficiaries[3],
            latitude=beneficiaries[3].latitude,
            longitude=beneficiaries[3].longitude,
            end_reason=reasons["Multiplication Obligation Fulfilled"],
            processed_by=officer1,
            offspring_count_returned=3,
            remarks="Returned 3 kids as required.",
            start_date=today - timedelta(days=300),
        )

        redisperse_animal(
            animal=animals[1],
            new_beneficiary=beneficiaries[4],
            latitude=beneficiaries[4].latitude,
            longitude=beneficiaries[4].longitude,
            end_reason=reasons["Beneficiary Request"],
            processed_by=officer1,
            remarks="Beneficiary Villanueva requested transfer due to health issues.",
            start_date=today - timedelta(days=120),
        )

        # Chain 3: Animal 3 (Cattle) → Beneficiary 5 (still active)
        disperse_animal(
            animal=animals[3],
            beneficiary=beneficiaries[5],
            latitude=beneficiaries[5].latitude,
            longitude=beneficiaries[5].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=200),
        )

        # Chain 4: Animal 5 (Swine) → Beneficiary 6 → Beneficiary 7
        disperse_animal(
            animal=animals[5],
            beneficiary=beneficiaries[6],
            latitude=beneficiaries[6].latitude,
            longitude=beneficiaries[6].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=250),
        )

        redisperse_animal(
            animal=animals[5],
            new_beneficiary=beneficiaries[7],
            latitude=beneficiaries[7].latitude,
            longitude=beneficiaries[7].longitude,
            end_reason=reasons["Non-Compliance with Care Agreement"],
            processed_by=officer1,
            remarks="Beneficiary failed to maintain proper housing.",
            start_date=today - timedelta(days=90),
        )

        # Chain 5: Batch chicken (animal 8) → Beneficiary 4
        disperse_animal(
            animal=animals[8],
            beneficiary=beneficiaries[4],
            latitude=beneficiaries[4].latitude,
            longitude=beneficiaries[4].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=150),
        )

        # Chain 6: Another goat (animal 2) → Beneficiary 8
        disperse_animal(
            animal=animals[2],
            beneficiary=beneficiaries[8],
            latitude=beneficiaries[8].latitude,
            longitude=beneficiaries[8].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=100),
        )

        # Chain 7: Pig (animal 6) → Beneficiary 9
        disperse_animal(
            animal=animals[6],
            beneficiary=beneficiaries[9],
            latitude=beneficiaries[9].latitude,
            longitude=beneficiaries[9].longitude,
            processed_by=officer1,
            start_date=today - timedelta(days=60),
        )

        self.stdout.write("  Created ownership records with multi-hop chains")

        # -------------------------------------------------------------------
        # Summary
        # -------------------------------------------------------------------
        self.stdout.write(self.style.SUCCESS(
            f"\n[OK] Demo data seeded successfully!\n"
            f"  Users:       {User.objects.count()}\n"
            f"  Barangays:   {Barangay.objects.count()}\n"
            f"  Beneficiaries: {Beneficiary.objects.count()}\n"
            f"  Species:     {Species.objects.count()}\n"
            f"  Animals:     {Animal.objects.count()}\n"
            f"  Records:     {OwnershipRecord.objects.count()}\n"
        ))

        # Print credentials
        self.stdout.write("  Login credentials:")
        self.stdout.write("  " + "-" * 60)
        self.stdout.write(f"  {'Username':<22} {'Password':<20} {'Role'}")
        self.stdout.write("  " + "-" * 60)
        for uname, pwd, role in credentials:
            self.stdout.write(f"  {uname:<22} {pwd:<20} {role}")
        self.stdout.write("  " + "-" * 60)

        if not use_dev_passwords:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "  ⚠  These passwords are shown ONCE. Distribute them securely.\n"
                    "     Users will be forced to set a new password on first login."
                )
            )
        self.stdout.write("")

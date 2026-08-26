from django.core.management.base import BaseCommand
from geotagging.models import HandoffReason


REASONS = [
    ("Caretaker Relocated", "The caretaker moved to a different area and can no longer care for the animal."),
    ("Caretaker No Longer Able to Care", "The caretaker is unable to continue due to personal circumstances."),
    ("Animal Reported Lost/Found", "The animal was lost and later found, requiring a new custodian."),
    ("Voluntary Surrender", "The caretaker voluntarily surrendered the animal back or to another party."),
    ("CVO Field Reassignment", "CVO officers reassigned the animal during a field visit or inspection."),
    ("Formal Re-Dispersal (see linked record)", "The handoff was triggered by a formal CVO re-dispersal transaction."),
    ("Non-Compliance", "The caretaker failed to meet program obligations."),
    ("Animal Outgrew Capacity", "The animal grew beyond the caretaker's backyard or housing capacity."),
    ("Temporary Fostering Ended", "A temporary fostering arrangement has concluded."),
    ("Health/Veterinary Reasons", "The animal required relocation for health or veterinary treatment."),
    ("Deceased/Retired", "The animal passed away or was retired from the program."),
    ("CVO Facility Transfer", "The animal was moved between CVO holding facilities."),
]


class Command(BaseCommand):
    help = "Seed HandoffReason lookup table with default reasons"

    def handle(self, *args, **options):
        created = 0
        for name, desc in REASONS:
            _, was_created = HandoffReason.objects.get_or_create(
                name=name,
                defaults={"description": desc, "is_active": True},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created} handoff reasons ({len(REASONS)} total)")
        )

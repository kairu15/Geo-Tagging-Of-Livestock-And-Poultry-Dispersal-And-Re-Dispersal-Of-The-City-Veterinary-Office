from django.core.management.base import BaseCommand
from health.models import DiseaseType


DISEASES = [
    {"name": "African Swine Fever (ASF)", "description": "Highly contagious viral disease affecting pigs. Critical for Philippine swine industry."},
    {"name": "Newcastle Disease", "description": "Viral disease affecting poultry. Causes respiratory, nervous, and digestive symptoms."},
    {"name": "Foot and Mouth Disease (FMD)", "description": "Highly contagious viral disease affecting cloven-hoofed animals (cattle, swine, goats)."},
    {"name": "Rabies", "description": "Fatal viral disease transmitted through bites. Affects all mammals."},
    {"name": "Brucellosis", "description": "Bacterial disease causing abortion in livestock. Zoonotic risk."},
    {"name": "Bovine Tuberculosis", "description": "Chronic bacterial disease affecting cattle. Zoonotic potential."},
    {"name": "Avian Influenza (Bird Flu)", "description": "Viral disease affecting poultry. Highly pathogenic strains are notifiable."},
    {"name": "Porcine Reproductive and Respiratory Syndrome (PRRS)", "description": "Viral disease causing reproductive failure and respiratory illness in swine."},
    {"name": "Caprine Arthritis Encephalitis (CAE)", "description": "Viral disease in goats causing chronic arthritis and wasting."},
    {"name": "Clostridial Diseases", "description": "Group of bacterial diseases including Blackleg, Enterotoxemia, and Tetanus."},
    {"name": "Internal Parasitism", "description": "Gastrointestinal parasite infections (roundworms, tapeworms, flukes)."},
    {"name": "External Parasitism", "description": "Ectoparasite infestations (ticks, mites, lice, flies)."},
]


class Command(BaseCommand):
    help = "Seed common Philippine livestock disease types"

    def handle(self, *args, **options):
        created_count = 0
        for disease in DISEASES:
            obj, created = DiseaseType.objects.get_or_create(
                name=disease["name"],
                defaults={"description": disease["description"]},
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created: {obj.name}")
            else:
                self.stdout.write(f"  Exists:  {obj.name}")

        self.stdout.write(
            self.style.SUCCESS(f"\nDone. {created_count} disease types created, "
                             f"{len(DISEASES) - created_count} already existed.")
        )

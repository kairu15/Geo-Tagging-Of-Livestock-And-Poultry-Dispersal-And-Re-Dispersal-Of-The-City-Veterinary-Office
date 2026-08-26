"""
Management command to create 5 staff (read-only) accounts.

Usage:
    python manage.py create_staff_accounts
    python manage.py create_staff_accounts --reset  # Reset all passwords to default
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

# 5 staff accounts -- each gets a unique name and credentials
STAFF_ACCOUNTS = [
    {
        "username": "staff.delgado",
        "first_name": "Maria",
        "last_name": "Delgado",
        "email": "maria.delgado@cvo.gov.ph",
        "password": "Staff@2026",
        "contact_number": "09171234001",
    },
    {
        "username": "staff.ramos",
        "first_name": "Juan",
        "last_name": "Ramos",
        "email": "juan.ramos@cvo.gov.ph",
        "password": "Staff@2026",
        "contact_number": "09171234002",
    },
    {
        "username": "staff.santos",
        "first_name": "Ana",
        "last_name": "Santos",
        "email": "ana.santos@cvo.gov.ph",
        "password": "Staff@2026",
        "contact_number": "09171234003",
    },
    {
        "username": "staff.cruz",
        "first_name": "Pedro",
        "last_name": "Cruz",
        "email": "pedro.cruz@cvo.gov.ph",
        "password": "Staff@2026",
        "contact_number": "09171234004",
    },
    {
        "username": "staff.reyes",
        "first_name": "Elena",
        "last_name": "Reyes",
        "email": "elena.reyes@cvo.gov.ph",
        "password": "Staff@2026",
        "contact_number": "09171234005",
    },
]


class Command(BaseCommand):
    help = "Create 5 staff (read-only) accounts for the CVO dashboard"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Reset all staff account passwords to the default",
        )

    def handle(self, *args, **options):
        reset = options["reset"]
        created_count = 0
        updated_count = 0

        self.stdout.write("")
        self.stdout.write("  Creating Staff (Read-Only) Accounts")
        self.stdout.write("  " + "-" * 50)

        for account in STAFF_ACCOUNTS:
            username = account["username"]

            if reset:
                try:
                    user = User.objects.get(username=username)
                    user.set_password(account["password"])
                    user.is_active = True
                    user.role = User.Role.STAFF
                    user.save()
                    updated_count += 1
                    self.stdout.write(
                        f"  [RESET] {username:<22} -> {account['password']}"
                    )
                    continue
                except User.DoesNotExist:
                    pass

            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    f"  [EXISTS] {username:<22} (skipped)"
                )
                continue

            user = User.objects.create_user(
                username=username,
                password=account["password"],
                email=account["email"],
                first_name=account["first_name"],
                last_name=account["last_name"],
                role=User.Role.STAFF,
                contact_number=account["contact_number"],
            )
            created_count += 1
            self.stdout.write(
                f"  [CREATED] {username:<22} ({account['first_name']} {account['last_name']})"
            )

        self.stdout.write("  " + "-" * 50)

        total = User.objects.filter(role=User.Role.STAFF).count()
        if reset:
            self.stdout.write(
                f"  {updated_count} passwords reset | {total} total staff accounts"
            )
        else:
            self.stdout.write(
                f"  {created_count} accounts created | {total} total staff accounts"
            )

        # Print summary table
        self.stdout.write("")
        self.stdout.write("  Staff Account Credentials")
        self.stdout.write("  " + "-" * 58)
        self.stdout.write(f"  {'Username':<22} {'Password':<14} {'Name'}")
        self.stdout.write("  " + "-" * 58)
        for account in STAFF_ACCOUNTS:
            self.stdout.write(
                f"  {account['username']:<22} {account['password']:<14} "
                f"{account['first_name']} {account['last_name']}"
            )
        self.stdout.write("  " + "-" * 58)
        self.stdout.write("")

"""
Management command to create 5 staff (read-only) accounts.

Provisioning behaviour
----------------------
* **Production** (DEBUG=False): each account receives a securely generated
  random password printed once to the console.  The ``must_change_password``
  flag is set so the user is forced to pick a real password on first login.
* **Development** (DEBUG=True): known throwaway passwords are used so local
  setup stays fast.  A ``--dev-only`` flag can also be passed explicitly to
  force the dev path.

Usage
-----
    # Production — prints random passwords
    python manage.py create_staff_accounts

    # Development — known throwaway passwords
    python manage.py create_staff_accounts --dev-only
    DJANGO_DEBUG=True python manage.py create_staff_accounts
"""
import secrets
import string

from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

# 5 staff accounts — each gets a unique name and credentials
STAFF_ACCOUNTS = [
    {
        "username": "staff.delgado",
        "first_name": "Maria",
        "last_name": "Delgado",
        "email": "maria.delgado@cvo.gov.ph",
        "contact_number": "09171234001",
    },
    {
        "username": "staff.ramos",
        "first_name": "Juan",
        "last_name": "Ramos",
        "email": "juan.ramos@cvo.gov.ph",
        "contact_number": "09171234002",
    },
    {
        "username": "staff.santos",
        "first_name": "Ana",
        "last_name": "Santos",
        "email": "ana.santos@cvo.gov.ph",
        "contact_number": "09171234003",
    },
    {
        "username": "staff.cruz",
        "first_name": "Pedro",
        "last_name": "Cruz",
        "email": "pedro.cruz@cvo.gov.ph",
        "contact_number": "09171234004",
    },
    {
        "username": "staff.reyes",
        "first_name": "Elena",
        "last_name": "Reyes",
        "email": "elena.reyes@cvo.gov.ph",
        "contact_number": "09171234005",
    },
]

# Known throwaway passwords used ONLY in local development.
_DEV_PASSWORDS = {
    "staff.delgado": "DevStaff1!",
    "staff.ramos": "DevStaff2!",
    "staff.santos": "DevStaff3!",
    "staff.cruz": "DevStaff4!",
    "staff.reyes": "DevStaff5!",
}


def _generate_password(length: int = 16) -> str:
    """Return a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Guarantee at least one of each category
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    password += [secrets.choice(alphabet) for _ in range(length - len(password))]
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


class Command(BaseCommand):
    help = "Create 5 staff (read-only) accounts for the CVO dashboard"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dev-only",
            action="store_true",
            help="Use known throwaway dev passwords (required when DEBUG is False)",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Reset all staff account passwords to new credentials",
        )

    def handle(self, *args, **options):
        dev_only = options["dev_only"]
        reset = options["reset"]

        # Determine provisioning mode
        use_dev_passwords = dev_only or settings.DEBUG

        if not use_dev_passwords and not settings.DEBUG:
            # Production mode — this is the intended safe path
            pass
        elif not use_dev_passwords and not dev_only and not settings.DEBUG:
            self.stderr.write(
                self.style.ERROR(
                    "ERROR: In production (DEBUG=False), you must use either\n"
                    "  --dev-only  to explicitly opt into known dev passwords, or\n"
                    "  omit the flag to generate secure random passwords.\n"
                )
            )
            return

        created_count = 0
        updated_count = 0
        credentials = []  # (username, password) pairs to print at the end

        self.stdout.write("")
        self.stdout.write("  Creating Staff (Read-Only) Accounts")
        self.stdout.write("  " + "-" * 50)

        for account in STAFF_ACCOUNTS:
            username = account["username"]

            if reset:
                try:
                    user = User.objects.get(username=username)
                    password = (
                        _DEV_PASSWORDS[username]
                        if use_dev_passwords
                        else _generate_password()
                    )
                    user.set_password(password)
                    user.must_change_password = not use_dev_passwords
                    user.is_active = True
                    user.role = User.Role.STAFF
                    user.save()
                    updated_count += 1
                    credentials.append((username, password))
                    self.stdout.write(f"  [RESET] {username:<22}")
                    continue
                except User.DoesNotExist:
                    pass

            if User.objects.filter(username=username).exists():
                self.stdout.write(f"  [EXISTS] {username:<22} (skipped)")
                continue

            password = (
                _DEV_PASSWORDS[username] if use_dev_passwords else _generate_password()
            )
            must_change = not use_dev_passwords

            user = User.objects.create_user(
                username=username,
                password=password,
                email=account["email"],
                first_name=account["first_name"],
                last_name=account["last_name"],
                role=User.Role.STAFF,
                contact_number=account["contact_number"],
                must_change_password=must_change,
            )
            created_count += 1
            credentials.append((username, password))
            self.stdout.write(
                f"  [CREATED] {username:<22} "
                f"({account['first_name']} {account['last_name']})"
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

        # Print credentials table
        self.stdout.write("")
        self.stdout.write("  Staff Account Credentials")
        self.stdout.write("  " + "-" * 58)
        self.stdout.write(f"  {'Username':<22} {'Password':<20} {'Name'}")
        self.stdout.write("  " + "-" * 58)
        for uname, pwd in credentials:
            acct = next(a for a in STAFF_ACCOUNTS if a["username"] == uname)
            self.stdout.write(
                f"  {uname:<22} {pwd:<20} "
                f"{acct['first_name']} {acct['last_name']}"
            )
        self.stdout.write("  " + "-" * 58)

        if not use_dev_passwords:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "  ⚠  These passwords are shown ONCE. Distribute them securely.\n"
                    "     Users will be forced to set a new password on first login."
                )
            )
        self.stdout.write("")

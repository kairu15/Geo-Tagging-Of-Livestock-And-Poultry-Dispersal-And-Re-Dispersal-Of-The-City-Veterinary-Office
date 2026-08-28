# CVO Geo-Tagging Livestock Dispersal System — Setup & Deployment

## Local Development

### Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url> && cd <project>

# 2. Create a .env file (copy from template below)
cp .env.example .env   # or create manually

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Run migrations
python manage.py migrate

# 5. Seed demo data (uses known throwaway dev passwords)
python manage.py seed_demo_data

# 6. Create staff accounts (uses known throwaway dev passwords)
python manage.py create_staff_accounts

# 7. Start the backend
python manage.py runserver

# 8. In a separate terminal — start the frontend
cd frontend && npm install && npm run dev
```

### Dev Login Credentials

When `DJANGO_DEBUG=True` (the default for local development), the seed
commands use known throwaway passwords.  **These must never be used in
production.**

| Role         | Username          | Dev Password |
|--------------|-------------------|--------------|
| ADMIN        | `admin`           | `admin123`   |
| OFFICER      | `dr.santos`       | `officer123` |
| SUPERVISOR   | `supervisor.reyes`| `super123`   |
| COORDINATOR  | `coord.delaCruz`  | `coord123`   |
| STAFF        | `staff.delgado`   | `DevStaff1!` |
| STAFF        | `staff.ramos`     | `DevStaff2!` |
| STAFF        | `staff.santos`    | `DevStaff3!` |
| STAFF        | `staff.cruz`      | `DevStaff4!` |
| STAFF        | `staff.reyes`     | `DevStaff5!` |

---

## Production Deployment

### Account Provisioning

In production (`DJANGO_DEBUG=False`), account provisioning uses the
**random-password-plus-forced-reset** approach:

1. Each provisioned account receives a **securely generated random password**
   (16 characters, mixed case + digits + symbols).
2. The password is **printed once to the console** during the seed command.
3. The `must_change_password` flag is set on the user, forcing them to choose
   a new password on first login before any other action is permitted.
4. No shared or known passwords are stored in source code.

#### Seeding all demo data (production)

```bash
# Generates random passwords — printed once, then gone
python manage.py seed_demo_data
```

This creates one user for each role (ADMIN, OFFICER, SUPERVISOR, COORDINATOR)
along with barangays, species, animals, and ownership records. Copy the
passwords from the command output and distribute them securely.

#### Creating staff accounts (production)

```bash
# Generates unique random passwords for each of the 5 staff accounts
python manage.py create_staff_accounts
```

#### Resetting a staff account password

```bash
# Regenerates a new random password for all staff accounts
python manage.py create_staff_accounts --reset
```

### Forced Password Reset Flow

When a user logs in with `must_change_password=True`:

1. The login API returns `must_change_password: true` in the response.
2. The frontend displays a **Set Your Password** form instead of the main app.
3. The user must provide their temporary password and choose a new one (≥ 8
   characters).
4. On success, the `must_change_password` flag is cleared, fresh tokens are
   issued, and the user proceeds to the app.
5. **Server-side enforcement**: the `MustChangePasswordMiddleware` blocks all
   API requests (except `/auth/change-password/`, `/auth/login/`, and
   `/auth/token/refresh/`) until the flag is cleared. This cannot be bypassed
   from the frontend.

### Manually Creating a New User (Admin)

Admins can create new users via the API:

```bash
curl -X POST http://localhost:8000/api/v1/auth/users/ \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new.officer",
    "password": "TempPass1!",
    "first_name": "New",
    "last_name": "Officer",
    "role": "OFFICER",
    "contact_number": "09170000000",
    "assigned_barangay": 1
  }'
```

For production, create the user without a password and set
`must_change_password=True`, then provide the temporary password out-of-band.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | Yes | — | Django secret key |
| `DJANGO_DEBUG` | No | `False` | Set `True` for local dev |
| `DJANGO_ALLOWED_HOSTS` | No | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DATABASE_URL` | No | `sqlite:///db.sqlite3` | Database connection URL |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated CORS origins |
| `MEDIA_ROOT` | No | `media` | Media files directory |

---

## Security Notes

### Previously Committed Demo Passwords — COMPROMISED

The following passwords were previously committed to source control and must
be treated as **compromised**:

- `admin123` (ADMIN account)
- `officer123` (OFFICER account)
- `super123` (SUPERVISOR account)
- `Staff@2026` (all 5 STAFF accounts)

**If this system has ever been deployed with these values, all affected
accounts must have their passwords rotated immediately.** The seed commands
now generate random passwords in production and use separate unique throwaway
passwords in development.

### What Changed

1. **No hardcoded passwords in source**: Production seed commands generate
   cryptographically secure random passwords and print them once.
2. **Forced password reset**: Provisioned users must set a real password on
   first login (`must_change_password` field + `MustChangePasswordMiddleware`).
3. **DEBUG gating**: Known dev passwords only work when `DJANGO_DEBUG=True`
   or `--dev-only` is explicitly passed. In production, the command refuses
   to run without generating random passwords.
4. **Unique credentials per user**: Each of the 5 staff accounts now has its
   own password (previously they all shared `Staff@2026`).
5. **COORDINATOR account added**: A `coord.delaCruz` user is now seeded with
   `assigned_barangay` set to San Isidro, completing all 5 roles.

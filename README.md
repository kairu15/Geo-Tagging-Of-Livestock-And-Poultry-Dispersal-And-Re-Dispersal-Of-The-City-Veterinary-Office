# Geo-Tagging of Livestock and Poultry Dispersal and Re-Dispersal — City Veterinary Office

A geo-tagging, dispersal, and re-dispersal tracking system for livestock and poultry beneficiaries under a City Veterinary Office (CVO) program. The system tracks the full lifecycle of a program animal — initial dispersal to a beneficiary, GPS-based field check-ins, custody/ownership transfers (re-dispersal), offspring/pass-on obligation compliance, and disease/health surveillance — with a complete, auditable chain-of-custody trail. It is scoped to Negros Oriental, Philippines, with barangay-level geographic precision.

## Key Features

### Beneficiary & Animal Registry
- Register beneficiaries with barangay assignment, household info, and GPS coordinates
- Track livestock (goat, cattle, swine) and poultry (chicken, duck) with auto-generated tag IDs (`CVO-{SPECIES}-{YEAR}-{SEQ}`)
- Species/breed management with livestock/poultry category distinction
- Batch tracking for poultry (e.g., 50 chicks dispersed as a lot)

### GPS Geo-Tagging & Field Check-ins
- Attach ear tags, leg bands, or QR codes to animals with linked GPS coordinates
- Custodianship tracking with intake condition and status
- Location check-ins with GPS accuracy flagging (auto-flags readings below configurable threshold)
- Check-in review workflow (approve/flag) for supervisors
- **Offline support**: IndexedDB-backed queue for check-in and disease report submissions — auto-syncs when connectivity returns

### Dispersal & Re-Dispersal Custody Tracking
- Append-only ownership ledger — one ACTIVE record per animal at any time (enforced at DB level)
- Initial dispersal, re-dispersal, and return-to-CVO workflows
- Coordinator submits re-dispersal request → Supervisor approves
- GPS coordinates captured at each transfer point for movement path reconstruction
- Animal condition recorded at each handover (healthy, sick, injured, pregnant, deceased)

### Health & Disease Surveillance
- Disease-suspect reporting with location capture for outbreak mapping
- Health event tracking (vaccination, deworming, treatment, inspection, illness, mortality)
- Quarantine zone management with barangay-level boundaries, blocking/non-blocking configuration
- Quarantine conflict detection API for dispersal workflow integration
- Radius search endpoint for outbreak response (haversine-based, no PostGIS required)

### Offspring & Pass-On Compliance
- Offspring records linking dams to children with status tracking (born, returned to CVO, remaining, deceased)
- Overdue offspring report — identifies beneficiaries who haven't met their pass-on obligation within configurable thresholds

### In-System Notifications
- Persistent, recipient-scoped notifications (users cannot see other users' notifications)
- Types: quarantine alerts, disease reports, dispersal/re-dispersal requests and approvals, pass-on due/overdue, system announcements
- Mark read, mark all read, archive, and delete actions

### Role-Based Access Control
- Five roles: `ADMIN`, `OFFICER`, `SUPERVISOR`, `COORDINATOR`, `STAFF`
- Forced password change flow (`MustChangePasswordMiddleware`) enforced server-side for newly provisioned accounts
- Frontend route guards by role (e.g., only OFFICER+ can register beneficiaries or disperse animals)

### Reporting & Dashboards
- Dispersal summary (by species, by barangay, with date/barangay/species filters)
- Re-dispersal frequency analysis (most transferred animals, most active beneficiaries)
- CSV export of dispersal records
- Overdue offspring pass-on report
- Public transparency dashboard (no auth required, no PII exposure)

## Tech Stack

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Django | 6.0.7 |
| REST API | Django REST Framework | 3.17.1 |
| Authentication | SimpleJWT (JWT tokens) | 5.5.1 |
| API Docs | drf-spectacular (OpenAPI/Swagger) | 0.29.0 |
| Filtering | django-filter | 24.3 |
| Audit Trail | django-simple-history | 3.13.0 |
| CORS | django-cors-headers | 4.9.0 |
| Env Management | django-environ | 0.14.0 |
| Image Handling | Pillow | 12.2.0 |
| Production Server | Gunicorn | 21.2.0 |
| Database | PostgreSQL (prod) / SQLite (dev) | — |
| Python | — | 3.12+ |

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 19.2.8 |
| Build Tool | Vite | 8.2.2 |
| Routing | React Router | 7.18.2 |
| Data Fetching | TanStack Query | 5.102.4 |
| Forms | react-hook-form + zod | 7.86.0 / 3.25.76 |
| CSS | Tailwind CSS | 4.3.3 |
| Maps | Leaflet / react-leaflet + MapLibre GL | 1.9.4 / 5.0.0 / 6.6.0 |
| Map Clustering | react-leaflet-markercluster | 5.0.0-rc.0 |
| Charts | Recharts | 3.10.1 |
| Icons | lucide-react | 1.34.0 |
| HTTP Client | axios | 1.19.0 |
| Linting | oxlint | 1.79.0 |

## Architecture

### Backend App Structure

```
cvo_project/
├── accounts/          # Auth, user roles, JWT login, forced password reset
├── beneficiaries/     # Beneficiaries + barangays (PSA/PSGC 2020 census data)
├── livestock/         # Species, breeds, animals, health records, offspring
├── dispersal/         # Ownership records, transfer reasons, re-dispersal requests
├── geotagging/        # Geo-tags, caretakers, custodianship, check-ins, handoff reasons
├── health/            # Disease types, health events, quarantine zones
├── notifications/     # In-app notifications (recipient-scoped)
├── reports/           # Report views/exports (no models — queries across other apps)
└── cvo_project/       # Django project settings (base/dev/prod), URLs, WSGI/ASGI
```

### Frontend Structure

```
frontend/src/
├── api/               # Axios config, offline queue, custom hooks
├── components/        # Reusable UI components (map, modals, status badges)
├── context/           # React context (auth)
├── pages/             # 19 page components (dashboard, animals, beneficiaries, etc.)
├── routes/            # Protected route wrapper with role-based guards
└── App.jsx            # Root with React Router routes
```

### Communication

The frontend communicates with the backend exclusively through REST API endpoints versioned under `/api/v1/`. Authentication uses JWT access/refresh tokens stored in `localStorage`, with automatic token refresh via axios interceptors. The Vite dev server proxies `/api` and `/media` requests to the Django backend.

### Project Structure

```
├── .github/workflows/   # CI (GitHub Actions)
├── accounts/            # Django app — auth & user management
├── beneficiaries/       # Django app — beneficiaries & barangays
├── livestock/           # Django app — animals, species, breeds
├── dispersal/           # Django app — custody ledger & transfers
├── geotagging/          # Django app — GPS tracking & custodianship
├── health/              # Django app — disease surveillance & quarantine
├── notifications/       # Django app — in-app notifications
├── reports/             # Django app — reporting & exports
├── cvo_project/         # Django project settings
├── frontend/            # React (Vite) frontend
├── manage.py            # Django management script
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables (not committed)
└── SETUP.md             # Detailed setup & deployment guide
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (for production; SQLite works for local dev)

### Backend Setup

```bash
# 1. Clone the repository
git clone <repo-url> && cd <project>

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Create a .env file with at minimum:
#    DJANGO_SECRET_KEY=<generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
#    DJANGO_DEBUG=True
#    DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
#    DATABASE_URL=sqlite:///db.sqlite3
#    CORS_ALLOWED_ORIGINS=http://localhost:5173
#    JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
#    JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
#    MEDIA_ROOT=media

# 5. Run migrations
python manage.py migrate

# 6. Seed production reference data
python manage.py seed_negros_oriental_barangays   # 557 barangays (PSA/PSGC 2020)
python manage.py seed_disease_types               # 12 livestock diseases
python manage.py seed_handoff_reasons             # 12 custody-transfer reasons

# 7. Seed demo data for local development (dev passwords only)
python manage.py seed_demo_data
python manage.py create_staff_accounts

# 8. Start the backend
python manage.py runserver
```

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server (proxies /api to Django on port 8002)
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the Django backend.

## Running Tests

```bash
# Run the full backend test suite (204 tests)
python manage.py test

# Run a specific app's tests
python manage.py test dispersal.tests
python manage.py test geotagging.tests
python manage.py test accounts.tests
python manage.py test beneficiaries.tests
python manage.py test health.tests
python manage.py test livestock.tests
python manage.py test notifications.tests
python manage.py test reports.tests
```

CI runs automatically on every push/PR to `main` via GitHub Actions (`.github/workflows/ci.yml`), executing the backend test suite against a PostgreSQL 16 service container and running frontend lint + build checks.

## User Roles

| Role | Access Level | Key Capabilities |
|------|-------------|-----------------|
| **ADMIN** | Full system access | User management, all CRUD, system configuration |
| **OFFICER** | Create/edit records | Register animals/beneficiaries, disperse/re-disperse, record health events |
| **SUPERVISOR** | Approve + all Officer access | Approve re-dispersal requests, review flagged check-ins, manage quarantine zones |
| **COORDINATOR** | Read-only + submit requests | View data, submit re-dispersal requests, submit disease reports |
| **STAFF** | Read-only | View dashboard, animals, beneficiaries, reports |

Newly provisioned accounts are forced to set a new password on first login (`MustChangePasswordMiddleware`).

## API Documentation

Once the backend is running, live interactive API documentation is available at:

| Format | URL |
|--------|-----|
| Swagger UI | `http://localhost:8000/api/v1/docs/` |
| ReDoc | `http://localhost:8000/api/v1/redoc/` |
| OpenAPI Schema (JSON) | `http://localhost:8000/api/v1/schema/` |

## License

License to be determined. This is a capstone project — contact the development team for usage terms.

## Contributing

Contributions are welcome. Please ensure all tests pass before submitting a pull request:

```bash
python manage.py test
```

CI must pass (backend tests + frontend lint + build) before merging to `main`.

from .base import *  # noqa: F401,F403

DEBUG = True

# SQLite is fine for dev; use db.sqlite3
DATABASES["default"]["NAME"] = str(BASE_DIR / "db.sqlite3")

# Allow all origins in dev for convenience
CORS_ALLOW_ALL_ORIGINS = True

# Add debug toolbar if available
try:
    import debug_toolbar  # noqa: F401
    INSTALLED_APPS += ["debug_toolbar"]
    MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass

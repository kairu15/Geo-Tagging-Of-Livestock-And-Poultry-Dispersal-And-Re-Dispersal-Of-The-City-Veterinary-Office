from .base import *  # noqa: F401,F403
import os

# ---------------------------------------------------------------------------
# Production Security Settings
# ---------------------------------------------------------------------------
DEBUG = False

# ALLOWED_HOSTS — must be set via env var in production
# Example: DJANGO_ALLOWED_HOSTS=cvo.example.com,www.cvo.example.com
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

# ---------------------------------------------------------------------------
# HTTPS / SSL Security
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# HSTS — tell browsers to only use HTTPS
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookie security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# ---------------------------------------------------------------------------
# Database — Postgres in production
# ---------------------------------------------------------------------------
DATABASES = {
    "default": env.db("DATABASE_URL", default="sqlite:///db.sqlite3"),
}

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_ROOT = BASE_DIR / "staticfiles"

# ---------------------------------------------------------------------------
# CORS — locked down for production
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True


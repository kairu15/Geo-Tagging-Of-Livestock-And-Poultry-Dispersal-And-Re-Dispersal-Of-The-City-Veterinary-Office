from .base import *  # noqa: F401,F403

DEBUG = False

# Override for production — switch to Postgres, set proper CORS, etc.
# CORS_ALLOWED_ORIGINS = ["https://yourdomain.com"]
# DATABASES = env.db("DATABASE_URL")  # Postgres in prod

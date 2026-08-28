"""
Middleware that enforces the must_change_password flag.

When a user has ``must_change_password=True``, every request is blocked with
HTTP 403 **except** requests to the forced password-change endpoint. This
prevents any API access (reads or writes) until the user has set a new
password — it is enforced server-side, not just as a frontend prompt.
"""
from django.http import JsonResponse
from django.conf import settings


class MustChangePasswordMiddleware:
    """
    Intercepts authenticated requests from users who must change their
    password and redirects them to the change-password endpoint.

    Allowed paths (bypass the block):
        /api/v1/auth/change-password/   — the forced-change endpoint
        /api/v1/auth/login/             — re-login after password change
        /api/v1/auth/token/refresh/     — token refresh (frontend loop)
        /admin/                         — Django admin (superusers only)
    """

    # Paths that must remain accessible even when must_change_password is True.
    _ALLOWED_PREFIXES = (
        "/api/v1/auth/change-password",
        "/api/v1/auth/login",
        "/api/v1/auth/token/refresh",
        "/admin/",
        "/api/schema",
        "/api/docs",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only act on authenticated requests with a user that has the flag set.
        user = getattr(request, "user", None)
        if (
            user is not None
            and user.is_authenticated
            and getattr(user, "must_change_password", False)
        ):
            # Use request.path (full original path) rather than path_info,
            # because path_info is stripped by Django's URL includes.
            path = request.path
            if not any(path.startswith(prefix) for prefix in self._ALLOWED_PREFIXES):
                return JsonResponse(
                    {
                        "error": "Password change required",
                        "code": "MUST_CHANGE_PASSWORD",
                    },
                    status=403,
                )

        return self.get_response(request)

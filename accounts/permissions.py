from rest_framework.permissions import BasePermission, SAFE_METHODS


class MustChangePassword(BasePermission):
    """Block all API access for users who must change their password.

    Exempts the change-password and login endpoints so the user can
    actually set a new password.  This is the DRF-level equivalent of
    ``MustChangePasswordMiddleware`` — enforced server-side and
    impossible to bypass from the frontend.
    """

    _ALLOWED_PATHS = (
        "/api/v1/auth/change-password",
        "/api/v1/auth/login",
        "/api/v1/auth/token/refresh",
    )

    def has_permission(self, request, view):
        user = request.user
        if (
            user is not None
            and user.is_authenticated
            and getattr(user, "must_change_password", False)
        ):
            if not any(request.path.startswith(p) for p in self._ALLOWED_PATHS):
                return False
        return True


class IsAdmin(BasePermission):
    """Full system admin access."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMIN"
        )


class IsOfficerOrAbove(BasePermission):
    """Officers, Supervisors, and Admins can create/edit records."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ("ADMIN", "OFFICER", "SUPERVISOR")


class IsSupervisorOrAbove(BasePermission):
    """Supervisors and Admins — for approval workflows and reports."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ("ADMIN", "SUPERVISOR")


class IsReadOnly(BasePermission):
    """Coordinator role — read-only + submit requests."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role in ("ADMIN", "OFFICER", "SUPERVISOR")


class IsAuthenticatedAndNotReadOnly(BasePermission):
    """Authenticated users with write access (ADMIN, OFFICER, SUPERVISOR).
    STAFF and COORDINATOR are blocked from write operations."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in ("ADMIN", "OFFICER", "SUPERVISOR")


class IsOwnerOrReadOnly(BasePermission):
    """Object-level: Officers can only modify their own-area records unless Admin/Supervisor."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        user = request.user
        if user.role in ("ADMIN", "SUPERVISOR"):
            return True
        # Officers can modify records they processed
        if hasattr(obj, "processed_by") and obj.processed_by_id == user.id:
            return True
        return False

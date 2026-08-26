from rest_framework.permissions import BasePermission


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

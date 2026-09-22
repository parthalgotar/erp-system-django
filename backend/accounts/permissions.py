from rest_framework.permissions import BasePermission


def HasRole(*roles):
    """Factory mirroring the FastAPI project's `require_role(*allowed_roles)`
    dependency — returns a DRF permission class allowing only those roles."""

    class _HasRole(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.role in roles)

    return _HasRole

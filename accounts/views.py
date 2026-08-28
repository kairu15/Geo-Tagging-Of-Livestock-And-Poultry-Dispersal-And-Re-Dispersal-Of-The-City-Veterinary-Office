from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
)
from .permissions import IsAdmin, MustChangePassword


class LoginThrottle(AnonRateThrottle):
    rate = "10/minute"

User = get_user_model()


class UserListCreateView(generics.ListCreateAPIView):
    """List all users or create a new one (Admin only)."""
    queryset = User.objects.all()
    permission_classes = [IsAdmin, MustChangePassword]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or soft-deactivate a user."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin, MustChangePassword]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    # Apply stricter throttle on login attempts
    throttle = LoginThrottle()
    if not throttle.allow_request(request, None):
        return Response(
            {"error": "Too many login attempts. Please try again later."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    """JWT login — returns access + refresh tokens."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = User.objects.filter(username=serializer.validated_data["username"]).first()
    if user is None or not user.check_password(serializer.validated_data["password"]):
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"error": "Account is deactivated"},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh = RefreshToken.for_user(user)
    response_data = {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }
    if user.must_change_password:
        response_data["must_change_password"] = True
    return Response(response_data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, MustChangePassword])
def me_view(request):
    """Return the currently authenticated user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAdmin, MustChangePassword])
def reset_password_view(request, pk):
    """Admin can reset a user's password."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    new_password = request.data.get("new_password")
    if not new_password or len(new_password) < 6:
        return Response(
            {"error": "Password must be at least 6 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()
    return Response({"message": f"Password reset for {user.username}"})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])  # Intentionally no MustChangePassword — this IS the reset endpoint
def force_change_password_view(request):
    """Change password when must_change_password is True.

    The user must provide their current (temporary) password and a new one.
    On success the ``must_change_password`` flag is cleared.
    """
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    old_password = serializer.validated_data["old_password"]
    new_password = serializer.validated_data["new_password"]

    if not user.check_password(old_password):
        return Response(
            {"error": "Current password is incorrect"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.must_change_password = False
    user.save()

    # Issue a fresh token so the old one (with stale claims) is discarded.
    refresh = RefreshToken.for_user(user)
    return Response({
        "message": "Password changed successfully",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })

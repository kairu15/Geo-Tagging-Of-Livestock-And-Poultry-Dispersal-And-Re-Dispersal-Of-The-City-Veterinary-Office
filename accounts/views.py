from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, UserCreateSerializer, LoginSerializer
from .permissions import IsAdmin

User = get_user_model()


class UserListCreateView(generics.ListCreateAPIView):
    """List all users or create a new one (Admin only)."""
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or soft-deactivate a user."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
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
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """Return the currently authenticated user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAdmin])
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

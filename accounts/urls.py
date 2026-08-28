from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    login_view,
    me_view,
    UserListCreateView,
    UserDetailView,
    reset_password_view,
    force_change_password_view,
)

urlpatterns = [
    path("login/", login_view, name="login"),
    path("me/", me_view, name="me"),
    path("change-password/", force_change_password_view, name="force-change-password"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/reset-password/", reset_password_view, name="user-reset-password"),
]

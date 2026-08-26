from django.urls import path
from .views import login_view, me_view, UserListCreateView, UserDetailView

urlpatterns = [
    path("login/", login_view, name="login"),
    path("me/", me_view, name="me"),
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
]

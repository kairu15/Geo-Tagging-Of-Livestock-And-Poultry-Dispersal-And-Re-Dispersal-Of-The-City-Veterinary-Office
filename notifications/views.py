from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer, NotificationListSerializer


class NotificationViewSet(viewsets.ViewSet):
    """
    Endpoints (all scoped to the requesting user):
      GET    /api/v1/notifications/            — paginated list
      GET    /api/v1/notifications/unread_count/ — unread count
      POST   /api/v1/notifications/{id}/read/   — mark one as read
      POST   /api/v1/notifications/read_all/     — mark all as read
      POST   /api/v1/notifications/{id}/archive/ — archive one
      DELETE /api/v1/notifications/{id}/         — hard-delete (admin convenience)
    """
    permission_classes = [IsAuthenticated]

    def _user_notifications(self):
        return Notification.objects.filter(recipient=self.request.user)

    def list(self, request):
        qs = self._user_notifications().filter(is_archived=False)

        # Filter by read/unread
        read_param = request.query_params.get("read")
        if read_param == "true":
            qs = qs.filter(is_read=True)
        elif read_param == "false":
            qs = qs.filter(is_read=False)

        # Filter by type
        ntype = request.query_params.get("type")
        if ntype:
            qs = qs.filter(notification_type=ntype)

        # Pagination
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 20))
        except (TypeError, ValueError):
            page, page_size = 1, 20

        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]

        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": NotificationListSerializer(items, many=True).data,
        })

    @action(detail=False, methods=["get"], url_path="unread_count")
    def unread_count(self, request):
        count = self._user_notifications().filter(is_read=False, is_archived=False).count()
        return Response({"unread_count": count})

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        try:
            n = self._user_notifications().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return Response({"status": "ok"})

    @action(detail=False, methods=["post"], url_path="read_all")
    def mark_all_read(self, request):
        updated = self._user_notifications().filter(is_read=False, is_archived=False).update(is_read=True)
        return Response({"marked_read": updated})

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        try:
            n = self._user_notifications().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        n.is_archived = True
        n.save(update_fields=["is_archived"])
        return Response({"status": "ok"})

    def destroy(self, request, pk=None):
        try:
            n = self._user_notifications().get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        n.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

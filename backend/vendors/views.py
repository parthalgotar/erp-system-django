from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from accounts.permissions import HasRole
from .models import Vendor
from .serializers import VendorSerializer


class VendorViewSet(viewsets.ModelViewSet):
    """Mirrors FastAPI's /vendors router: create needs admin/dispatcher,
    list/retrieve are public."""

    queryset = Vendor.objects.all().order_by("-id")
    serializer_class = VendorSerializer

    def get_permissions(self):
        if self.action == "create":
            return [HasRole("admin", "dispatcher")()]
        return [AllowAny()]

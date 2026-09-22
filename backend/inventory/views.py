from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasRole
from .models import InventoryItem, Warehouse
from .serializers import InventoryItemSerializer, StockAdjustSerializer, WarehouseSerializer


class WarehouseListCreateView(generics.ListCreateAPIView):
    queryset = Warehouse.objects.all().order_by("-id")
    serializer_class = WarehouseSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [HasRole("admin")()]
        return [AllowAny()]


class InventoryItemListCreateView(generics.ListCreateAPIView):
    queryset = InventoryItem.objects.all().order_by("-id")
    serializer_class = InventoryItemSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [HasRole("admin", "dispatcher")()]
        return [AllowAny()]


class StockAdjustView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, item_id):
        item = get_object_or_404(InventoryItem, id=item_id)
        serializer = StockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_qty = item.quantity + serializer.validated_data["delta"]
        if new_qty < 0:
            return Response({"detail": "Insufficient stock"}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = new_qty
        item.save()
        return Response(InventoryItemSerializer(item).data)

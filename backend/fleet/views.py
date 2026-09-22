from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasRole
from .models import Driver, Vehicle
from .serializers import DriverLocationSerializer, DriverSerializer, VehicleSerializer


class DriverListCreateView(generics.ListCreateAPIView):
    queryset = Driver.objects.all().order_by("-id")
    serializer_class = DriverSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [HasRole("admin")()]
        return [AllowAny()]


class DriverLocationView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, driver_id):
        driver = get_object_or_404(Driver, id=driver_id)
        serializer = DriverLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver.current_lat = serializer.validated_data["latitude"]
        driver.current_lng = serializer.validated_data["longitude"]
        driver.save()
        return Response(DriverSerializer(driver).data)


class VehicleListCreateView(generics.ListCreateAPIView):
    queryset = Vehicle.objects.all().order_by("-id")
    serializer_class = VehicleSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [HasRole("admin")()]
        return [AllowAny()]

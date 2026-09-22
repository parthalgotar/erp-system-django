from django.db import models


class VehicleType(models.TextChoices):
    BIKE = "bike", "Bike"
    VAN = "van", "Van"
    TRUCK = "truck", "Truck"


class Driver(models.Model):
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    is_available = models.BooleanField(default=True)
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.full_name


class Vehicle(models.Model):
    plate_number = models.CharField(max_length=50, unique=True)
    vehicle_type = models.CharField(max_length=10, choices=VehicleType.choices)
    capacity_kg = models.FloatField(default=0)

    def __str__(self):
        return self.plate_number

from django.db import models


class Vendor(models.Model):
    name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=30)
    address = models.CharField(max_length=500)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name

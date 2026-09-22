from django.contrib import admin

from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "contact_phone", "address"]
    search_fields = ["name", "contact_phone"]

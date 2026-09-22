from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health", health),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/vendors/", include("vendors.urls")),
    path("api/v1/fleet/", include("fleet.urls")),
    path("api/v1/inventory/", include("inventory.urls")),
    path("api/v1/orders/", include("orders.urls")),
    path("api/v1/dispatch/", include("dispatch.urls")),
    path("api/v1/dashboard/", include("dashboard.urls")),
]

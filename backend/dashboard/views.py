from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderStatus

TERMINAL_DELIVERED = {OrderStatus.DELIVERED, OrderStatus.CLOSED}
TERMINAL_RETURNED = {OrderStatus.RTO_INITIATED, OrderStatus.RETURNED}
IN_TRANSIT = {
    OrderStatus.BOOKING_PLANNED, OrderStatus.PICKUP_COMPLETED, OrderStatus.LABEL_VERIFIED,
    OrderStatus.MANIFEST_CREATED, OrderStatus.AT_ORIGIN_HUB, OrderStatus.SORTED_AT_ORIGIN,
    OrderStatus.DISPATCHED_LINEHAUL, OrderStatus.AT_DESTINATION_HUB, OrderStatus.ROUTE_PLANNED,
    OrderStatus.OUT_FOR_DELIVERY, OrderStatus.REATTEMPT_SCHEDULED,
}

PHASE_MAP = {
    OrderStatus.ORDER_RECEIVED: "First Mile",
    OrderStatus.BOOKING_PLANNED: "First Mile",
    OrderStatus.PICKUP_COMPLETED: "First Mile",
    OrderStatus.LABEL_VERIFIED: "First Mile",
    OrderStatus.MANIFEST_CREATED: "First Mile",
    OrderStatus.AT_ORIGIN_HUB: "First Mile",
    OrderStatus.SORTED_AT_ORIGIN: "Linehaul",
    OrderStatus.DISPATCHED_LINEHAUL: "Linehaul",
    OrderStatus.AT_DESTINATION_HUB: "Linehaul",
    OrderStatus.ROUTE_PLANNED: "Linehaul",
    OrderStatus.OUT_FOR_DELIVERY: "Last Mile",
    OrderStatus.DELIVERY_ATTEMPTED: "Last Mile",
    OrderStatus.DELIVERED: "Last Mile",
    OrderStatus.CLOSED: "Closed",
    OrderStatus.DELIVERY_FAILED: "Exception",
    OrderStatus.REATTEMPT_SCHEDULED: "Exception",
    OrderStatus.RTO_INITIATED: "Exception",
    OrderStatus.RETURNED: "Exception",
    OrderStatus.CANCELLED: "Exception",
}


class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        orders = list(Order.objects.all())
        total = len(orders)

        status_breakdown: dict[str, int] = {}
        phase_breakdown = {"First Mile": 0, "Linehaul": 0, "Last Mile": 0, "Closed": 0, "Exception": 0}

        in_transit = delivered = failed = rto = 0
        cod_pending = cod_collected = 0.0

        for o in orders:
            status_breakdown[o.status] = status_breakdown.get(o.status, 0) + 1
            phase_breakdown[PHASE_MAP.get(o.status, "First Mile")] += 1

            if o.status in IN_TRANSIT:
                in_transit += 1
            if o.status in TERMINAL_DELIVERED:
                delivered += 1
            if o.status == OrderStatus.DELIVERY_FAILED:
                failed += 1
            if o.status in TERMINAL_RETURNED:
                rto += 1

            if o.is_cod:
                if o.status == OrderStatus.CLOSED:
                    cod_collected += o.cod_amount
                else:
                    cod_pending += o.cod_amount

        return Response({
            "total_orders": total,
            "in_transit": in_transit,
            "delivered": delivered,
            "delivery_failed": failed,
            "rto": rto,
            "cod_pending": round(cod_pending, 2),
            "cod_collected": round(cod_collected, 2),
            "status_breakdown": status_breakdown,
            "phase_breakdown": phase_breakdown,
        })

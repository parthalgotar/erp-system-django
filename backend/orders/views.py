from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from vendors.models import Vendor
from .invoice_pdf import build_invoice_pdf
from .models import MILESTONE_DOCUMENTS, Order, OrderEvent, OrderStatus
from .serializers import (
    BookingSerializer,
    DeliveryAttemptSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderSerializer,
)
from .services import next_happy_status

MAX_DELIVERY_ATTEMPTS = 3


def _log_event(order: Order, status_: str, remarks: str | None = None) -> Order:
    order.status = status_
    order.save()
    OrderEvent.objects.create(
        order=order,
        status=status_,
        document_name=MILESTONE_DOCUMENTS.get(status_, "Record"),
        remarks=remarks,
    )
    return order


# ---------------------------------------------------------------- Create (Milestone 1) + List
class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Order.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status_filter")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        OrderEvent.objects.create(
            order=order,
            status=OrderStatus.ORDER_RECEIVED,
            document_name=MILESTONE_DOCUMENTS[OrderStatus.ORDER_RECEIVED],
            remarks="Customer order captured",
        )
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------- Read
class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    queryset = Order.objects.all()
    serializer_class = OrderDetailSerializer
    lookup_url_kwarg = "order_id"


class OrderTrackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, tracking_number):
        order = Order.objects.filter(tracking_number=tracking_number).first()
        if not order:
            return Response({"detail": "No shipment with that tracking number"}, status=404)
        return Response(OrderDetailSerializer(order).data)


# ---------------------------------------------------------------- Booking (Milestone 2)
class OrderBookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        if order.status != OrderStatus.ORDER_RECEIVED:
            return Response({"detail": "Booking can only be planned right after order is received"}, status=409)
        serializer = BookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.pickup_date = serializer.validated_data["pickup_date"]
        order.pickup_slot = serializer.validated_data["pickup_slot"]
        order.save()
        order = _log_event(order, OrderStatus.BOOKING_PLANNED, "Pickup scheduled")
        return Response(OrderDetailSerializer(order).data)


# ---------------------------------------------------------------- Generic milestone advance
class OrderAdvanceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        nxt = next_happy_status(order.status)
        if nxt is None:
            return Response({"detail": f"Cannot advance further from '{order.status}'"}, status=409)
        if nxt in (OrderStatus.DELIVERY_ATTEMPTED, OrderStatus.DELIVERED):
            return Response({"detail": "Use /delivery-attempt to record a delivery outcome"}, status=409)
        if nxt == OrderStatus.CLOSED:
            return Response({"detail": "Use /close-billing to close and invoice"}, status=409)
        remarks = request.query_params.get("remarks")
        order = _log_event(order, nxt, remarks)
        return Response(OrderDetailSerializer(order).data)


# ---------------------------------------------------------------- Delivery attempt (Milestone 12-13)
class OrderDeliveryAttemptView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        if order.status not in (OrderStatus.OUT_FOR_DELIVERY, OrderStatus.REATTEMPT_SCHEDULED):
            return Response({"detail": "Order must be out for delivery to log an attempt"}, status=409)

        serializer = DeliveryAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order.delivery_attempt_count += 1
        order.save()

        if data["success"]:
            if not data.get("proof_type"):
                # FRD Business Rule: POD mandatory to mark "Delivered".
                return Response({"detail": "proof_type is required to mark an order Delivered"}, status=422)
            order = _log_event(
                order, OrderStatus.DELIVERED,
                f"POD captured via {data['proof_type']}; recipient: {data.get('recipient_name') or 'N/A'}",
            )
            return Response(OrderDetailSerializer(order).data)

        order = _log_event(order, OrderStatus.DELIVERY_FAILED, data.get("remarks") or "Delivery attempt failed")

        if order.delivery_attempt_count >= MAX_DELIVERY_ATTEMPTS:
            order = _log_event(
                order, OrderStatus.RTO_INITIATED,
                f"Auto RTO after {order.delivery_attempt_count} failed attempts",
            )
        return Response(OrderDetailSerializer(order).data)


class OrderReattemptView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        if order.status != OrderStatus.DELIVERY_FAILED:
            return Response({"detail": "Reattempt can only be scheduled after a failed delivery"}, status=409)
        remarks = request.query_params.get("remarks")
        order = _log_event(order, OrderStatus.REATTEMPT_SCHEDULED, remarks or "Re-delivery scheduled")
        order.status = OrderStatus.OUT_FOR_DELIVERY
        order.save()
        return Response(OrderDetailSerializer(order).data)


class OrderRtoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        if order.status not in (OrderStatus.DELIVERY_FAILED, OrderStatus.RTO_INITIATED):
            return Response({"detail": "RTO can only start from a failed delivery"}, status=409)
        remarks = request.query_params.get("remarks")
        order = _log_event(order, OrderStatus.RTO_INITIATED, remarks or "Customer refused / max attempts reached")
        order = _log_event(order, OrderStatus.RETURNED, "Reverse shipment created back to origin")
        return Response(OrderDetailSerializer(order).data)


# ---------------------------------------------------------------- Billing / Closure (Milestone 14)
class OrderCloseBillingView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        if order.status != OrderStatus.DELIVERED:
            return Response({"detail": "Order must be Delivered before billing/closure"}, status=409)
        try:
            freight_charge = float(request.query_params.get("freight_charge"))
        except (TypeError, ValueError):
            return Response({"detail": "freight_charge query param is required"}, status=422)

        order.freight_charge = freight_charge
        order.invoice_number = f"INV-{order.order_number.split('-')[-1]}"
        order.invoice_amount = freight_charge + (order.cod_amount if order.is_cod else 0)
        order.save()
        order = _log_event(order, OrderStatus.CLOSED, f"Freight Invoice {order.invoice_number} generated")
        return Response(OrderDetailSerializer(order).data)


# ---------------------------------------------------------------- Invoice PDF download
class OrderInvoicePdfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        if order.status != OrderStatus.CLOSED:
            return Response({"detail": "Invoice is only available after the order is closed and billed"}, status=409)

        vendor_name, vendor_address = "—", "—"
        vendor = Vendor.objects.filter(id=order.vendor_id).first()
        if vendor:
            vendor_name, vendor_address = vendor.name, vendor.address

        pdf_bytes = build_invoice_pdf(order, vendor_name, vendor_address)
        filename = f"{order.invoice_number or order.order_number}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        # "inline" (not "attachment") tells the browser to open/view the PDF
        # instead of forcing an immediate download — the user can still save
        # it from the browser's own PDF viewer.
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

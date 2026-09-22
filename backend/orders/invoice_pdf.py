"""
Renders the Freight Invoice / Shipment Closure Record (FRD Milestone 14)
as a downloadable PDF, styled to match the ERP console's freight-green theme.
"""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas



INK = colors.HexColor("#101820")
FREIGHT = colors.HexColor("#2F6F4E")
FREIGHT_DARK = colors.HexColor("#1E4A33")
MUTED = colors.HexColor("#4B5A63")
LINE = colors.HexColor("#DDE2DC")


def build_invoice_pdf(order, vendor_name: str, vendor_address: str) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    left = 20 * mm
    right = width - 20 * mm

    # Header band
    c.setFillColor(FREIGHT_DARK)
    c.rect(0, height - 32 * mm, width, 32 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(left, height - 15 * mm, "ERP Console")
    c.setFillColor(colors.HexColor("#8FD9B4"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(left, height - 22 * mm, "FREIGHT INVOICE")
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 9)
    c.drawRightString(right, height - 15 * mm, order.invoice_number or "—")
    c.drawRightString(right, height - 21 * mm, f"Order: {order.order_number}")
    c.drawRightString(right, height - 27 * mm, f"Tracking: {order.tracking_number}")

    y = height - 44 * mm
    mid = width / 2

    def label_value(y, label, value, x=left):
        c.setFont("Helvetica", 8.5)
        c.setFillColor(MUTED)
        c.drawString(x, y, label.upper())
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColor(INK)
        c.drawString(x, y - 5.2 * mm, value)

    label_value(y, "Shipper (Vendor)", vendor_name)
    label_value(y, "Consignee", order.customer_name, x=mid)
    c.setFont("Helvetica", 8.5)
    c.setFillColor(MUTED)
    c.drawString(left, y - 9.5 * mm, vendor_address[:70])
    c.drawString(mid, y - 9.5 * mm, order.delivery_address[:70])

    y -= 21 * mm
    label_value(y, "Route", f"{order.origin_city or '—'}  ->  {order.destination_city or '—'}")
    label_value(y - 11 * mm, "Commodity", f"{order.commodity} ({order.weight_kg} kg)")

    # Charges table
    y -= 32 * mm
    c.setFillColor(colors.HexColor("#F3F5F2"))
    c.rect(left, y, right - left, 8 * mm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(left + 2 * mm, y + 2.5 * mm, "DESCRIPTION")
    c.drawRightString(right - 2 * mm, y + 2.5 * mm, "AMOUNT (INR)")

    rows = [("Freight charges", order.freight_charge)]
    if order.is_cod:
        rows.append(("COD amount collected", order.cod_amount))

    row_y = y - 8 * mm
    c.setFont("Helvetica", 10)
    for desc, amount in rows:
        c.setFillColor(INK)
        c.drawString(left + 2 * mm, row_y + 2 * mm, desc)
        c.drawRightString(right - 2 * mm, row_y + 2 * mm, f"{amount:,.2f}")
        c.setStrokeColor(LINE)
        c.line(left, row_y, right, row_y)
        row_y -= 8 * mm

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(FREIGHT)
    c.drawString(left + 2 * mm, row_y - 2 * mm, "TOTAL")
    c.drawRightString(right - 2 * mm, row_y - 2 * mm, f"INR {order.invoice_amount:,.2f}")

    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawString(left, 15 * mm, "System-generated invoice — ERP Console (Domestic Logistics Platform).")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()

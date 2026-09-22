import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import StatusTimeline from "../components/StatusTimeline.jsx";
import OrderDrawer from "../components/OrderDrawer.jsx";
import { Card, Button, Input, ErrorBanner, EmptyState } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const emptyForm = {
  vendor_id: "",
  customer_name: "",
  customer_phone: "",
  delivery_address: "",
  delivery_lat: "",
  delivery_lng: "",
  origin_city: "",
  destination_city: "",
  commodity: "",
  weight_kg: "",
  declared_value: "",
  is_cod: false,
  cod_amount: "",
  sku: "",
  quantity: 1,
};

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);

  async function loadOrders() {
    const data = await api.listOrders(token);
    setOrders(data);
  }

  useEffect(() => {
    async function load() {
      try {
        const [ordersData, vendorsData] = await Promise.all([
          api.listOrders(token),
          api.listVendors(token),
        ]);
        setOrders(ordersData);
        setVendors(vendorsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createOrder(token, {
        vendor_id: Number(form.vendor_id),
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_address: form.delivery_address,
        delivery_lat: form.delivery_lat ? Number(form.delivery_lat) : null,
        delivery_lng: form.delivery_lng ? Number(form.delivery_lng) : null,
        origin_city: form.origin_city,
        destination_city: form.destination_city,
        commodity: form.commodity || "General Cargo",
        weight_kg: form.weight_kg ? Number(form.weight_kg) : 0,
        declared_value: form.declared_value ? Number(form.declared_value) : 0,
        is_cod: form.is_cod,
        cod_amount: form.is_cod && form.cod_amount ? Number(form.cod_amount) : 0,
        items: form.sku ? [{ sku: form.sku, quantity: Number(form.quantity) }] : [],
      });
      setForm(emptyForm);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openOrder(order) {
    const full = await api.getOrder(token, order.id);
    setSelected(full);
  }

  function handleUpdate(updated) {
    setSelected(updated);
    loadOrders();
  }

  return (
    <Layout eyebrow="First mile → linehaul → last mile" title="Orders">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 h-fit">
          <h3 className="font-display font-semibold text-ink mb-4">New order (Milestone 1)</h3>
          <ErrorBanner message={error} />
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink-soft">Vendor (shipper)</span>
              <select
                required
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                className="rounded-md border border-paper-line bg-white px-3 py-2 text-sm focus:border-freight outline-none"
              >
                <option value="" disabled>Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
            <Input label="Customer (consignee)" required value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <Input label="Customer phone" required value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            <Input label="Delivery address" required value={form.delivery_address}
              onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Origin city" value={form.origin_city}
                onChange={(e) => setForm({ ...form, origin_city: e.target.value })} placeholder="Pune" />
              <Input label="Destination city" value={form.destination_city}
                onChange={(e) => setForm({ ...form, destination_city: e.target.value })} placeholder="Mumbai" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" type="number" step="any" value={form.delivery_lat}
                onChange={(e) => setForm({ ...form, delivery_lat: e.target.value })} placeholder="19.11" />
              <Input label="Longitude" type="number" step="any" value={form.delivery_lng}
                onChange={(e) => setForm({ ...form, delivery_lng: e.target.value })} placeholder="72.86" />
            </div>
            <Input label="Commodity" value={form.commodity}
              onChange={(e) => setForm({ ...form, commodity: e.target.value })} placeholder="Apparel cartons" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Weight (kg)" type="number" step="any" value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
              <Input label="Declared value (₹)" type="number" value={form.declared_value}
                onChange={(e) => setForm({ ...form, declared_value: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={form.is_cod}
                onChange={(e) => setForm({ ...form, is_cod: e.target.checked })} className="accent-freight" />
              This is a COD shipment
            </label>
            {form.is_cod && (
              <Input label="COD amount (₹)" type="number" value={form.cod_amount}
                onChange={(e) => setForm({ ...form, cod_amount: e.target.value })} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="SKU" value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" />
              <Input label="Quantity" type="number" min="1" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <Button type="submit" disabled={submitting || vendors.length === 0} className="mt-2">
              {submitting ? "Creating…" : "Create order"}
            </Button>
            {vendors.length === 0 && !loading && (
              <p className="text-xs text-ink-faint">Add a vendor first on the Vendors page.</p>
            )}
          </form>
        </Card>

        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-ink-faint text-sm">Loading orders…</p>
          ) : orders.length === 0 ? (
            <EmptyState title="No orders yet" hint="Create your first order using the form." />
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="p-5 cursor-pointer hover:border-freight/40 transition-colors duration-200"
                  onClick={() => openOrder(order)}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-mono text-xs text-ink-faint">{order.order_number}</p>
                      <p className="font-display font-medium text-ink">{order.customer_name}</p>
                      <p className="text-sm text-ink-faint">{order.delivery_address}</p>
                    </div>
                    {order.is_cod && (
                      <span className="text-xs font-medium text-transit whitespace-nowrap">
                        COD ₹{order.cod_amount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <StatusTimeline status={order.status} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <OrderDrawer order={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />
    </Layout>
  );
}

import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { Card, Button, Input, ErrorBanner, EmptyState } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const emptyForm = { name: "", contact_phone: "", address: "", latitude: "", longitude: "" };

export default function Vendors() {
  const { token } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadVendors() {
    const data = await api.listVendors(token);
    setVendors(data);
  }

  useEffect(() => {
    loadVendors()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createVendor(token, {
        name: form.name,
        contact_phone: form.contact_phone,
        address: form.address,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      });
      setForm(emptyForm);
      await loadVendors();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout eyebrow="First-mile pickup points" title="Vendors">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 h-fit">
          <h3 className="font-display font-semibold text-ink mb-4">New vendor</h3>
          <ErrorBanner message={error} />
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <Input label="Name" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fresh Farms" />
            <Input label="Contact phone" required value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <Input label="Address" required value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitude" type="number" step="any" value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="23.02" />
              <Input label="Longitude" type="number" step="any" value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="72.57" />
            </div>
            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? "Adding…" : "Add vendor"}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-ink-faint text-sm">Loading vendors…</p>
          ) : vendors.length === 0 ? (
            <EmptyState title="No vendors yet" hint="Add your first pickup point using the form." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vendors.map((v) => (
                <Card key={v.id} className="p-5">
                  <p className="font-display font-medium text-ink">{v.name}</p>
                  <p className="text-sm text-ink-faint mt-1">{v.address}</p>
                  <p className="font-mono text-xs text-ink-faint mt-2">{v.contact_phone}</p>
                  {v.latitude != null && (
                    <p className="font-mono text-xs text-ink-faint">
                      {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

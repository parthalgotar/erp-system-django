import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, FileCheck2, ArrowRightCircle, CheckCircle2, XCircle, RotateCcw, Receipt, Download } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusTimeline from "./StatusTimeline.jsx";

const HAPPY_BEFORE_DELIVERY = [
  "order_received", "booking_planned", "pickup_completed", "label_verified",
  "manifest_created", "at_origin_hub", "sorted_at_origin", "dispatched_linehaul",
  "at_destination_hub", "route_planned",
];

function ActionButton({ onClick, icon: Icon, label, tone = "freight", disabled, busy }) {
  const toneClass = {
    freight: "border-freight/40 text-freight-dark hover:bg-freight-soft",
    green: "border-freight/40 text-freight-dark hover:bg-freight-soft",
    red: "border-alert/40 text-alert hover:bg-alert-soft",
    amber: "border-transit/40 text-transit hover:bg-transit-soft",
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md border text-sm font-medium transition-colors duration-200 disabled:opacity-40 ${toneClass}`}
    >
      <Icon size={14} />
      {busy ? "Working…" : label}
    </button>
  );
}

export default function OrderDrawer({ order, onClose, onUpdate }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!order) return null;
  const o = order;

  const run = async (fn) => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await fn();
      onUpdate(updated);
    } catch (e) {
      setErr(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const canAdvance = HAPPY_BEFORE_DELIVERY.includes(o.status);
  const canDeliverAttempt = ["out_for_delivery", "reattempt_scheduled"].includes(o.status);
  const canExceptionAct = o.status === "delivery_failed";
  const canBill = o.status === "delivered";
  const canDownloadInvoice = o.status === "closed";

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-paper-card border-l border-paper-line z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-paper-card/95 backdrop-blur border-b border-paper-line px-6 py-5 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-scan">{o.tracking_number}</p>
                <h3 className="font-display text-lg font-semibold text-ink mt-1">{o.order_number}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-paper-line grid place-items-center hover:border-freight hover:text-freight transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <StatusTimeline status={o.status} />

              {o.is_cod && (
                <p className="text-xs font-medium text-transit">COD ₹{o.cod_amount.toLocaleString("en-IN")}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-ink-faint mb-1">Customer</p>
                  <p className="text-ink">{o.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint mb-1">Route</p>
                  <p className="text-ink">{o.origin_city || "—"} → {o.destination_city || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-ink-faint mb-1">Delivery Address</p>
                  <p className="text-ink">{o.delivery_address}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint mb-1">Commodity</p>
                  <p className="text-ink">{o.commodity} ({o.weight_kg} kg)</p>
                </div>
              </div>

              <div className="rounded-md border border-paper-line bg-paper p-4">
                <p className="text-xs font-medium tracking-wide uppercase text-ink-faint mb-3">Advance this order</p>
                <div className="flex flex-wrap gap-2.5">
                  {canAdvance && (
                    <ActionButton icon={ArrowRightCircle} label="Advance to next milestone" busy={busy}
                      onClick={() => run(() => api.advanceOrder(token, o.id))} />
                  )}
                  {canDeliverAttempt && (
                    <>
                      <ActionButton icon={CheckCircle2} label="Mark delivered (OTP proof)" tone="green" busy={busy}
                        onClick={() => run(() => api.deliveryAttempt(token, o.id, { success: true, proof_type: "otp", recipient_name: o.customer_name }))} />
                      <ActionButton icon={XCircle} label="Log failed attempt" tone="red" busy={busy}
                        onClick={() => run(() => api.deliveryAttempt(token, o.id, { success: false, remarks: "Customer unavailable" }))} />
                    </>
                  )}
                  {canExceptionAct && (
                    <>
                      <ActionButton icon={RotateCcw} label="Schedule reattempt" tone="amber" busy={busy}
                        onClick={() => run(() => api.reattempt(token, o.id))} />
                      <ActionButton icon={XCircle} label="Initiate RTO" tone="red" busy={busy}
                        onClick={() => run(() => api.initiateRto(token, o.id))} />
                    </>
                  )}
                  {canBill && (
                    <ActionButton icon={Receipt} label="Close & generate invoice" tone="green" busy={busy}
                      onClick={() => run(() => api.closeBilling(token, o.id, Math.round(o.weight_kg * 12.5) || 500))} />
                  )}
                  {canDownloadInvoice && (
                    <a
                      href={api.invoiceUrl(o.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-freight/40 text-freight-dark hover:bg-freight-soft text-sm font-medium transition-colors duration-200"
                    >
                      <Download size={14} /> View Freight Invoice (PDF)
                    </a>
                  )}
                  {!canAdvance && !canDeliverAttempt && !canExceptionAct && !canBill && !canDownloadInvoice && (
                    <p className="text-xs text-ink-faint">No further action — order lifecycle is complete.</p>
                  )}
                </div>
                {err && <p className="text-xs text-alert mt-3">{err}</p>}
              </div>

              <div>
                <p className="text-xs font-medium tracking-wide uppercase text-ink-faint mb-3">Milestone trail</p>
                <ol className="relative border-l border-paper-line ml-2 space-y-5">
                  {o.events?.map((ev) => (
                    <li key={ev.id} className="ml-5">
                      <span className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-freight border-2 border-paper-card" />
                      <div className="flex items-center gap-2">
                        <FileCheck2 size={13} className="text-scan" />
                        <p className="text-sm text-ink font-medium">{ev.document_name}</p>
                      </div>
                      {ev.remarks && <p className="text-xs text-ink-faint mt-0.5">{ev.remarks}</p>}
                      <p className="text-xs font-mono text-ink-faint/70 mt-0.5">
                        {new Date(ev.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

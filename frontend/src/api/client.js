const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = "GET", body, token, auth = true, query } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const qs = query
    ? "?" + Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
    : "";

  const res = await fetch(`${API_URL}${path}${qs}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.detail
      ? typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail)
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data?.detail);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),

  listVendors: (token) => request("/vendors/", { token }),
  createVendor: (token, payload) => request("/vendors/", { method: "POST", body: payload, token }),

  listOrders: (token, statusFilter) => request("/orders/", { token, query: statusFilter ? { status_filter: statusFilter } : undefined }),
  createOrder: (token, payload) => request("/orders/", { method: "POST", body: payload, token }),
  getOrder: (token, orderId) => request(`/orders/${orderId}`, { token }),
  trackOrder: (trackingNumber) => request(`/orders/track/${trackingNumber}`, { auth: false }),
  bookOrder: (token, orderId, payload) => request(`/orders/${orderId}/book`, { method: "POST", body: payload, token }),
  advanceOrder: (token, orderId, remarks) =>
    request(`/orders/${orderId}/advance`, { method: "POST", token, query: { remarks } }),
  deliveryAttempt: (token, orderId, payload) =>
    request(`/orders/${orderId}/delivery-attempt`, { method: "POST", body: payload, token }),
  reattempt: (token, orderId, remarks) =>
    request(`/orders/${orderId}/reattempt`, { method: "POST", token, query: { remarks } }),
  initiateRto: (token, orderId, remarks) =>
    request(`/orders/${orderId}/rto`, { method: "POST", token, query: { remarks } }),
  closeBilling: (token, orderId, freightCharge) =>
    request(`/orders/${orderId}/close-billing`, { method: "POST", token, query: { freight_charge: freightCharge } }),
  invoiceUrl: (orderId) => `${API_URL}/orders/${orderId}/invoice.pdf`,

  getDashboardStats: (token) => request("/dashboard/stats", { token }),

  listDrivers: (token) => request("/fleet/drivers", { token }),
  createDriver: (token, payload) => request("/fleet/drivers", { method: "POST", body: payload, token }),
  updateDriverLocation: (token, driverId, payload) =>
    request(`/fleet/drivers/${driverId}/location`, { method: "PATCH", body: payload, token }),

  assignDriver: (token, orderId) =>
    request(`/dispatch/orders/${orderId}/assign`, { method: "POST", token }),
};

export { ApiError };

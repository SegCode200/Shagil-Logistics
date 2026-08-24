import type {
  DeliveryZone,
  DeliveryZoneImport,
  LoginResponse,
  Order,
  OrderStatus,
  Rider,
  User,
  RiderRating,
  RiderReport,
  RiderReportStatus,
  PaginatedResponse,
} from "@/lib/types";
import { normalizeNigerianPhone } from "@/lib/phone";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function normalizePhoneFields(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" && key.toLowerCase().includes("phone")
        ? normalizeNigerianPhone(value)
        : value,
    ]),
  );
}

function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value)
    return (value as { data: T }).data;
  return value as T;
}

function paginationQuery(page: number, pageSize: number) {
  return `?page=${page}&pageSize=${pageSize}`;
}

function listFromResponse<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const result = value as { items?: unknown; reports?: unknown; data?: unknown };
    if (Array.isArray(result.items)) return result.items as T[];
    if (Array.isArray(result.reports)) return result.reports as T[];
    if (Array.isArray(result.data)) return result.data as T[];
  }
  return [];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include", 
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    const body = await response.json().catch(() => null);
    console.error("API request failed:", { body });
    throw new Error(body?.message || body?.error || "REQUEST_FAILED");
  }
  if (response.status === 204) return undefined as T;
  return unwrap<T>(await response.json());
}

async function requestBlob(path: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(response.status === 401 ? "SESSION_EXPIRED" : "REQUEST_FAILED");
  return response.blob();
}

export const api = {
  login: (payload: { phone: string; password: string }) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () => request<User>("/auth/me"),
  logout: () =>
    request<void>("/auth/logout", { method: "POST" }).catch(() => undefined),
  getOrders: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<Order>>(`/orders${paginationQuery(page, pageSize)}`),
  getOrder: (orderId: string) => request<Order>(`/orders/${orderId}`),
  createOrder: (payload: Partial<Order>, files: File[] = []) => {
    if (files.length) {
      const body = new FormData();
      Object.entries(normalizePhoneFields(payload)).forEach(([key, value]) => {
        if (key === "images" || value == null) return;
        body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      });
      files.slice(0, 3).forEach((file) => body.append("images", file, file.name));
      return request<Order>("/orders", { method: "POST", body });
    }
    return request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    });
  },
  updateOrder: (orderId: string, payload: Record<string, unknown>) =>
    request<Order>(`/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  markOutForDelivery: (orderId: string) =>
    request<Order>(`/orders/${orderId}/out-for-delivery`, { method: "POST" }),
  cancelOrder: (orderId: string) =>
    request<Order>(`/orders/${orderId}/cancel`, { method: "POST" }),
  getRiders: () => request<Rider[]>("/riders"),
  createRider: (payload: Pick<Rider, "name" | "phone">) =>
    request<Rider>("/riders", {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  resendRiderAccess: (riderId: string) =>
    request<{ notificationStatus: string }>(
      `/riders/${encodeURIComponent(riderId)}/resend-login-link`,
      { method: "POST" },
    ),
  getRiderOrders: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<Order>>(`/rider/orders${paginationQuery(page, pageSize)}`),
  accessRider: (token: string) =>
    request<{ token?: string; accessToken?: string; user?: User }>(
      `/riders/access/${encodeURIComponent(token)}`,
    ),
  updateOrderStatus: (orderId: string, status: OrderStatus) =>
    request<Order>(`/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  assignRider: (orderId: string, riderId: string) =>
    request<Order>(`/orders/${orderId}/assign`, {
      method: "POST",
      body: JSON.stringify({ riderId }),
    }),
  markPackageReceived: (orderId: string) =>
    request<Order>(`/orders/${orderId}/package-received`, { method: "POST" }),
  confirmPayment: (orderId: string, amountReceived: number) =>
    request<Order>(`/rider/orders/${orderId}/confirm-payment`, {
      method: "POST",
      body: JSON.stringify({ amountReceived }),
    }),
  confirmDelivery: (payload: { orderId: string; deliveryCode: string }) =>
    request<Order>("/rider/confirm-delivery", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDeliveryZones: () => request<DeliveryZone[]>("/orders/zones"),
  createDeliveryZone: (payload: Omit<DeliveryZone, "id">) =>
    request<DeliveryZone>("/orders/zones", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateDeliveryZone: (
    id: string,
    payload: Partial<Omit<DeliveryZone, "id">>,
  ) =>
    request<DeliveryZone>(`/orders/zones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  exportDeliveryZones: () => requestBlob("/orders/zones/export"),
  downloadDeliveryZoneTemplate: () => requestBlob("/orders/zones/template"),
  uploadDeliveryZoneExcel: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<DeliveryZoneImport>("/orders/zones/import", { method: "POST", body, headers: {} });
  },
  createPublicOrder: (token: string, payload: Record<string, unknown>) =>
    request<Order>(`/public/orders/${token}`, {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  getCustomerDelivery: (token: string) =>
    request<Order>(`/public/deliveries/${token}`),
  submitDeliveryRating: (token: string, payload: { rating: number; comment?: string }) =>
    request<RiderRating>(`/public/delivery/${token}/rating`, { method: "POST", body: JSON.stringify(payload) }),
  submitDeliveryReport: (token: string, payload: { reason: string; description: string }) =>
    request<RiderReport>(`/public/delivery/${token}/report`, { method: "POST", body: JSON.stringify(payload) }),
  getRiderRatings: () => request<RiderRating[]>("/riders/me/ratings"),
  getRiderReports: () => request<RiderReport[]>("/riders/me/reports"),
  getAdminRiderRatings: (riderId: string) => request<RiderRating[]>(`/orders/riders/${riderId}/ratings`),
  getAdminRiderReports: (riderId: string) => request<RiderReport[]>(`/orders/riders/${riderId}/reports`),
  getAdminRiderReportsList: async () =>
    listFromResponse<RiderReport>(await request<unknown>("/orders/rider-reports")),
  updateAdminReportStatus: (reportId: string, status: RiderReportStatus) => request<RiderReport>(`/orders/rider-reports/${reportId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

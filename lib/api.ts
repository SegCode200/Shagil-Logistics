import type {
  DeliveryZone,
  LoginResponse,
  Order,
  OrderStatus,
  Rider,
  User,
} from "@/lib/types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value)
    return (value as { data: T }).data;
  return value as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || body?.error || "REQUEST_FAILED");
  }
  if (response.status === 204) return undefined as T;
  return unwrap<T>(await response.json());
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
  getOrders: () => request<Order[]>("/orders"),
  getOrder: (orderId: string) => request<Order>(`/orders/${orderId}`),
  createOrder: (payload: Partial<Order> & { assignedRiderId?: string }) =>
    request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateOrder: (orderId: string, payload: Record<string, unknown>) =>
    request<Order>(`/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  markOutForDelivery: (orderId: string) =>
    request<Order>(`/orders/${orderId}/out-for-delivery`, { method: "POST" }),
  cancelOrder: (orderId: string) =>
    request<Order>(`/orders/${orderId}/cancel`, { method: "POST" }),
  getRiders: () => request<Rider[]>("/riders"),
  createRider: (payload: Pick<Rider, "name" | "phone">) =>
    request<Rider>("/riders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getRiderOrders: () => request<Order[]>("/rider/orders"),
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
  createPublicOrder: (token: string, payload: Record<string, unknown>) =>
    request<Order>(`/public/orders/${token}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCustomerDelivery: (token: string) =>
    request<Order>(`/public/deliveries/${token}`),
};

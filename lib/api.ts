import type {
  DeliveryZone,
  DeliveryZoneImport,
  LoginResponse,
  Order,
  OrderStatus,
  AccountDetails,
  CompanySettings,
  CompanyBike,
  PublicSenderOrder,
  Rider,
  User,
  RiderRating,
  RiderReport,
  RiderReportStatus,
  PaginatedResponse,
  Station,
  StationManager,
  StationRider,
  PublicStation,
  PaymentStatus,
  ReceiverCollectionStatus,
  Sender,
  RiderCommissionSummary,
  ShopCategory,
  ShopProduct,
  ShopOrder,
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
    const result = value as {
      items?: unknown;
      reports?: unknown;
      riders?: unknown;
      data?: unknown;
      orders?: unknown;
      products?: unknown;
      categories?: unknown;
    };
    if (Array.isArray(result.items)) return result.items as T[];
    if (Array.isArray(result.reports)) return result.reports as T[];
    if (Array.isArray(result.riders)) return result.riders as T[];
    if (Array.isArray(result.orders)) return result.orders as T[];
    if (Array.isArray(result.products)) return result.products as T[];
    if (Array.isArray(result.categories)) return result.categories as T[];
    if (Array.isArray(result.data)) return result.data as T[];
  }
  return [];
}

function appendFormField(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;

  if (typeof value === "boolean") {
    formData.append(key, value ? "true" : "false");
    return;
  }

  if (typeof value === "string" && (key === "isFeatured" || key === "isActive")) {
    formData.append(key, value.toLowerCase() === "true" ? "true" : "false");
    return;
  }

  formData.append(key, typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
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
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 ? "SESSION_EXPIRED" : "REQUEST_FAILED",
    );
  return response.blob();
}

async function getAllOrders() {
  const firstPage = await request<PaginatedResponse<Order>>("/orders?page=1&pageSize=100");
  if (firstPage.pagination.totalPages <= 1) return firstPage.items;
  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      request<PaginatedResponse<Order>>(`/orders?page=${index + 2}&pageSize=100`),
    ),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

export const api = {
  login: (payload: { phone: string; password: string }) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () => request<User>("/auth/me"),
  getSettings: () => request<CompanySettings>("/settings"),
  updateSettings: (payload: Partial<CompanySettings>) =>
    request<CompanySettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request<void>("/auth/logout", { method: "POST" }).catch(() => undefined),
  getOrders: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<Order>>(
      `/orders${paginationQuery(page, pageSize)}`,
    ),
  getAllOrders,
  getOrder: (orderId: string) => request<Order>(`/orders/${orderId}`),
  createOrder: (payload: Partial<Order>, files: File[] = []) => {
    if (files.length) {
      const body = new FormData();
      Object.entries(normalizePhoneFields(payload)).forEach(([key, value]) => {
        if (key === "images" || value == null) return;
        body.append(
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value),
        );
      });
      files
        .slice(0, 3)
        .forEach((file) => body.append("images", file, file.name));
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
  updateAccountDetails: (payload: AccountDetails) =>
    request<User>("/auth/account-details", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAccountDetails: () =>
    request<AccountDetails | null>("/auth/account-details"),
  approveOrder: (orderId: string) =>
    request<Order>(`/orders/${orderId}/approve`, { method: "POST" }),
  resendSenderAccessToken: (orderId: string) =>
    request<{ notificationStatus?: string }>(
      `/orders/${orderId}/resend-sender-access-token`,
      { method: "POST" },
    ),
  resendReceiverAccessToken: (orderId: string) =>
    request<{ notificationStatus?: string }>(
      `/orders/${orderId}/resend-receiver-access-token`,
      { method: "POST" },
    ),
  cancelOrder: (orderId: string) =>
    request<Order>(`/orders/${orderId}/cancel`, { method: "POST" }),
  getRiders: () => request<Rider[]>("/riders"),
  getBikes: async () =>
    listFromResponse<CompanyBike>(await request<unknown>("/bikes")),
  createBike: (payload: {
    bikeId: string;
    companyPhoneNumber: string;
    stationId: string;
  }) =>
    request<CompanyBike>("/bikes", {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  assignBike: (bikeId: string, riderId: string) =>
    request<CompanyBike>(
      `/bikes/${encodeURIComponent(bikeId)}/riders/${encodeURIComponent(riderId)}`,
      { method: "POST" },
    ),
  removeBikeRider: (bikeId: string) =>
    request<CompanyBike>(`/bikes/${encodeURIComponent(bikeId)}/rider`, {
      method: "DELETE",
    }),
  createRider: (payload: {
    name: string;
    phone: string;
    address: string;
    zoneIds: string[];
    bikeId: string;
  }) =>
    request<Rider>("/riders", {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  updateRider: (
    riderId: string,
    payload: { name: string; zoneIds: string[] },
  ) =>
    request<Rider>(`/riders/${encodeURIComponent(riderId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  resendRiderAccess: (riderId: string) =>
    request<{ notificationStatus: string }>(
      `/riders/${encodeURIComponent(riderId)}/resend-login-link`,
      { method: "POST" },
    ),
  getPublicShopCategories: async () =>
    listFromResponse<ShopCategory>(await request<unknown>("/shop/categories")),
  getPublicShopProducts: async () =>
    listFromResponse<ShopProduct>(await request<unknown>("/shop/products")),
  getPublicShopProduct: (slug: string) =>
    request<ShopProduct>(`/shop/products/${encodeURIComponent(slug)}`),
  getPublicShopCategoryProducts: async (slug: string) =>
    listFromResponse<ShopProduct>(await request<unknown>(`/shop/categories/${encodeURIComponent(slug)}/products`)),
  createShopOrder: (payload: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress: string;
    customerNote?: string;
    deliveryZoneId: string;
    items: Array<{ productId: string; quantity: number }>;
  }) =>
    request<ShopOrder>("/shop/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getShopCategories: async () =>
    listFromResponse<ShopCategory>(await request<unknown>("/shop/admin/categories")),
  getShopCategory: (categoryId: string) =>
    request<ShopCategory>(`/shop/admin/categories/${encodeURIComponent(categoryId)}`),
  createShopCategory: (payload: { name: string; isActive?: boolean }) =>
    request<ShopCategory>("/shop/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateShopCategory: (categoryId: string, payload: { name?: string; isActive?: boolean }) =>
    request<ShopCategory>(`/shop/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteShopCategory: (categoryId: string) =>
    request<{ deleted: boolean }>(`/shop/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE",
    }),
  getShopProducts: async () =>
    listFromResponse<ShopProduct>(await request<unknown>("/shop/admin/products")),
  createShopProduct: (payload: Record<string, unknown>, files: File[] = []) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "sku") return;
      appendFormField(formData, key, value);
    });
    files.forEach((file) => formData.append("images", file, file.name));
    return request<ShopProduct>("/shop/admin/products", {
      method: "POST",
      body: formData,
    });
  },
  updateShopProduct: (productId: string, payload: Record<string, unknown>, files: File[] = []) => {
    if (files.length === 0) {
      return request<ShopProduct>(`/shop/admin/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      appendFormField(formData, key, value);
    });
    files.forEach((file) => formData.append("images", file, file.name));
    return request<ShopProduct>(`/shop/admin/products/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: formData,
    });
  },
  deleteShopProduct: (productId: string) =>
    request<{ deleted: boolean }>(`/shop/admin/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    }),
  deleteShopProductImage: (productId: string, imageId: string) =>
    request<{ deleted: boolean }>(`/shop/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`, {
      method: "DELETE",
    }),
  getShopOrders: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<ShopOrder>>(`/shop/admin/orders${paginationQuery(page, pageSize)}`),
  getShopOrder: (orderId: string) => request<ShopOrder>(`/shop/admin/orders/${encodeURIComponent(orderId)}`),
  updateShopOrderStatus: (orderId: string, status: "NEW" | "PROCESSING" | "COMPLETED" | "CANCELLED") =>
    request<ShopOrder>(`/shop/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getRiderOrders: (page = 1, pageSize = 20) =>
    request<PaginatedResponse<Order>>(
      `/rider/orders${paginationQuery(page, pageSize)}`,
    ),
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
    request<Order>(`/riders/orders/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ riderId }),
    }),
  reassignRider: (orderId: string, riderId: string) =>
    request<Order>(`/orders/${encodeURIComponent(orderId)}/reassign-rider`, {
      method: "POST",
      body: JSON.stringify({ riderId }),
    }),
  confirmReceiverPaymentForUser: (orderId: string) =>
    request<Order>(
      `/orders/${encodeURIComponent(orderId)}/confirm-receiver-payment`,
      { method: "POST" },
    ),
  confirmFinalPayment: (orderId: string) =>
    request<Order>(`/orders/${encodeURIComponent(orderId)}/confirm-final-payment`, {
      method: "POST",
    }),
  companyPaid: (orderId: string) =>
    request<Order>(`/orders/${encodeURIComponent(orderId)}/company-payment`, {
      method: "POST",
    }),
  resendReceiverDeliveryCodeForUser: (orderId: string) =>
    request<{ notificationStatus?: string }>(
      `/riders/orders/${encodeURIComponent(orderId)}/resend-delivery-code`,
      { method: "POST" },
    ),
  confirmDelivery: (payload: { orderId: string; deliveryCode: string }) =>
    request<Order>("/rider/confirm-delivery", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDeliveryZones: () => request<DeliveryZone[]>("/orders/zones"),
  getStations: async () =>
    listFromResponse<Station>(await request<unknown>("/stations")),
  getStation: (stationId: string) =>
    request<Station>(`/stations/${encodeURIComponent(stationId)}`),
  createStation: (
    payload: { name: string; address?: string },
    zoneDistances: File,
  ) => {
    const body = new FormData();
    body.append("name", payload.name);
    if (payload.address) body.append("address", payload.address);
    body.append("zoneDistances", zoneDistances, zoneDistances.name);
    return request<Station>("/stations", { method: "POST", body });
  },
  uploadStationZoneDistances: (stationId: string, file: File) => {
    const body = new FormData();
    body.append("zoneDistances", file, file.name);
    return request<Station>(
      `/stations/${encodeURIComponent(stationId)}/zone-distances`,
      { method: "POST", body },
    );
  },
  downloadZoneDistanceTemplate: () =>
    requestBlob("/stations/zone-distances/template"),
  downloadStationZoneDistanceTemplate: (stationId: string) =>
    requestBlob(
      `/stations/${encodeURIComponent(stationId)}/zone-distances/template`,
    ),
  updateStation: (
    stationId: string,
    payload: Pick<Station, "name" | "address">,
  ) =>
    request<Station>(`/stations/${encodeURIComponent(stationId)}`, {
      method: "PATCH",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  getStationManagers: (stationId: string) =>
    request<StationManager[]>(
      `/stations/${encodeURIComponent(stationId)}/managers`,
    ),
  getManagers: async (): Promise<StationManager[]> =>
    listFromResponse<StationManager>(await request<unknown>("/stations/managers")),
  createManager: (payload: {
    name: string;
    phone: string;
    password: string;
    stationId: string;
  }) =>
    request<StationManager>("/stations/managers", {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  assignManagerToStation: (stationId: string, userId: string) =>
    request<StationManager>(
      `/stations/${encodeURIComponent(stationId)}/managers`,
      { method: "POST", body: JSON.stringify({ userId }) },
    ),
  removeManagerFromStation: (stationId: string, userId: string) =>
    request<void>(
      `/stations/${encodeURIComponent(stationId)}/managers/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
  getStationRiders: async () =>
    listFromResponse<StationRider>(
      await request<unknown>("/stations/manager/riders"),
    ),
  assignRiderToStation: (stationId: string, riderId: string) =>
    request<StationRider>(`/stations/${encodeURIComponent(stationId)}/riders`, {
      method: "POST",
      body: JSON.stringify({ riderId }),
    }),
  getManagerOrders: async () =>
    listFromResponse<Order>(await request<unknown>("/stations/manager/orders")),
  getManagerOrder: (orderId: string) =>
    request<Order>(`/stations/manager/orders/${encodeURIComponent(orderId)}`),
  updateManagerOrder: (
    orderId: string,
    payload: Record<string, unknown>,
  ) =>
    request<Order>(`/stations/manager/orders/${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  approveManagerOrder: (orderId: string) =>
    request<Order>(
      `/stations/manager/orders/${encodeURIComponent(orderId)}/approve`,
      { method: "POST" },
    ),
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
    return request<DeliveryZoneImport>("/orders/zones/import", {
      method: "POST",
      body,
      headers: {},
    });
  },
  createPublicOrder: (token: string, payload: Record<string, unknown>) =>
    request<Order>(`/public/orders/${token}`, {
      method: "POST",
      body: JSON.stringify(normalizePhoneFields(payload)),
    }),
  getCustomerDelivery: (token: string) =>
    request<Order>(`/public/delivery/${token}`),
  getPublicStations: async () =>
    listFromResponse<PublicStation>(await request<unknown>("/public/stations")),
  getPublicSenderOrders: async (token: string) =>
    listFromResponse<PublicSenderOrder>(
      await request<unknown>(`/public/sender-orders/${encodeURIComponent(token)}`),
    ),
  confirmReceiverPayment: (token: string) =>
    request<{
      orderId: string;
      paymentStatus?: PaymentStatus;
      receiverCollectionStatus?: ReceiverCollectionStatus;
    }>(`/public/delivery/${encodeURIComponent(token)}/confirm-payment`, {
      method: "POST",
    }),
  authorizePayment: (orderId: string) =>
    request<Order>(`/orders/${encodeURIComponent(orderId)}/authorize-payment`, {
      method: "POST",
    }),
  getPublicSender: (token: string) =>
    request<PublicSenderOrder>(`/public/sender/${encodeURIComponent(token)}`),
  senderPaid: (orderId: string) =>
    request<PublicSenderOrder>(
      `/orders/${encodeURIComponent(orderId)}/sender-payment`,
      {
        method: "POST",
      },
    ),
  uploadSenderPaymentReceipt: (token: string, orderId: string, file: File) => {
    const body = new FormData();
    body.append("receipts", file, file.name);
    return request<unknown>(`/public/sender/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}/already-paid-receipt`, {
      method: "POST",
      body,
    });
  },
  uploadAlreadyPaidReceipts: (orderId: string, file: File) => {
    const body = new FormData();
    body.append("receipts", file, file.name);
    return request<unknown>(`/orders/${encodeURIComponent(orderId)}/already-paid-receipts`, {
      method: "POST",
      body,
    });
  },
  uploadPaymentOnDeliveryReceipts: (orderId: string, file: File) => {
    const body = new FormData();
    body.append("receipts", file, file.name);
    return request<unknown>(`/orders/${encodeURIComponent(orderId)}/payment-on-delivery-receipts`, {
      method: "POST",
      body,
    });
  },
  senderPickedUp: (token: string, orderId: string) =>
    request<PublicSenderOrder>(
      `/public/sender/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}/pickup`,
      { method: "POST" },
    ),
  resendReceiverDeliveryCode: (token: string) =>
    request<{ notificationStatus?: string }>(
      `/public/delivery/${encodeURIComponent(token)}/resend-code`,
      { method: "POST" },
    ),
  submitDeliveryRating: (
    token: string,
    payload: { rating: number; comment?: string },
  ) =>
    request<RiderRating>(`/public/delivery/${token}/rating`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submitDeliveryReport: (
    token: string,
    payload: { reason: string; description: string },
  ) =>
    request<RiderReport>(`/public/delivery/${token}/report`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getRiderRatings: () => request<RiderRating[]>("/riders/me/ratings"),
  getRiderReports: () => request<RiderReport[]>("/riders/me/reports"),
  getCommissionSummary: () =>
    request<RiderCommissionSummary>("/riders/me/commission-summary"),
  getAdminRiderRatings: (riderId: string) =>
    request<RiderRating[]>(`/orders/riders/${riderId}/ratings`),
  getAdminRiderReports: (riderId: string) =>
    request<RiderReport[]>(`/orders/riders/${riderId}/reports`),
  getAdminRiderReportsList: async () =>
    listFromResponse<RiderReport>(
      await request<unknown>("/orders/rider-reports"),
    ),
  updateAdminReportStatus: (reportId: string, status: RiderReportStatus) =>
    request<RiderReport>(`/orders/rider-reports/${reportId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getSenders: async () =>
    listFromResponse<Sender>(await request<unknown>("/senders/")),
  createSenderAccess: (payload: { name: string; phone: string }) =>
  request<Sender>('/senders/', {
    method: "POST",
    body: JSON.stringify(normalizePhoneFields(payload)),
  }),
  resendSenderAccess: (senderId: string) =>
    request<{ notificationStatus?: string }>(
      `/senders/${encodeURIComponent(senderId)}/resend-access-token`,
      { method: "POST" },
    ),
}




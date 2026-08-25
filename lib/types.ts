export type Role = "OWNER" | "RIDER";
export type OrderStatus =
  | "PENDING"
  | "PENDING_APPROVAL"
  | "WAITING_FOR_PACKAGE"
  | "APPROVED"
  | "PACKAGE_RECEIVED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentMethod = "ALREADY_PAID" | "PAYMENT_ON_DELIVERY";
export type PaymentStatus = "NOT_REQUIRED" | "PENDING" | "PAID";
export type CompanyPaymentStatus = "PENDING" | "PAID";
export type SenderPaymentStatus = "PENDING" | "PAID";
export type ReceiverCollectionStatus = "NOT_COLLECTED" | "COLLECTED";
export type PickupMethod = "SENDER_DROPOFF" | "RIDER_PICKUP";
export type AccountDetails = {
  accountName: string;
  accountNumber: string;
  bankName: string;
};

export type OrderImage = {
  id?: string;
  publicUrl?: string;
  url?: string;
  originalFilename?: string;
  name?: string;
};
export type PublicSenderOrder = {
  orderId: string;
  senderName?: string | null;
  senderPhoneNumber?: string | null;
  receiverName?: string | null;
  receiverPhoneNumber?: string | null;
  orderDetails?: string | null;
  deliveryAddress: string;
  deliveryZone?: { name?: string | null } | null;
  quantity?: number | null;
  packageNotes?: string | null;
  deliveryFee: number | string;
  paymentMethod: PaymentMethod;
  assignedRiderId?: string | null;
  senderPaymentStatus: SenderPaymentStatus;
  status: OrderStatus;
  assignedRider?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null;
  accountDetails?: AccountDetails | null;
  images?: OrderImage[];
};
export type OrderEvent = { id: string; type: string; createdAt: string; createdBy?: User | null };
export type Notification = { id: string; type: string; status: "SENT" | "FAILED"; createdAt: string };
export type RiderRating = { id: string; orderId: string; riderId?: string; rating: number; comment?: string | null; createdAt: string };
export type RiderReportStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
export type RiderReport = { id: string; orderId: string; riderId?: string; reason: string; description: string; status: RiderReportStatus; createdAt: string };

export type User = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: Role;
  accountDetails?: AccountDetails | null;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
};

export type Order = {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  orderDetails: string;
  deliveryAddress: string;
  amount?: number | string;
  deliveryCode?: string;
  status: OrderStatus;
  rider?: User | null;
  assignedRider?: User | null;
  createdAt: string;
  deliveredAt?: string | null;
  confirmedBy?: User | null;
  senderName?: string;
  senderPhoneNumber?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhoneNumber?: string;
  receiverPhone?: string;
  packageDescription?: string;
  quantity?: number;
  notes?: string;
  packageNotes?: string;
  pickupMethod?: PickupMethod;
  pickupAddress?: string;
  pickupInstructions?: string;
  deliveryZoneId?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  orderAmount?: number | string;
  deliveryFee?: number | string;
  totalAmountToCollect?: number | string;
  senderAmount?: number | string;
  companyDeliveryAmount?: number | string;
  publicToken?: string;
  deliveryToken?: string;
  senderAccessToken?: string;
  receiverAccessToken?: string;
  assignedRiderId?: string | null;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  approvedAt?: string | null;
  approvedBy?: User | null;
  companyPaymentStatus?: CompanyPaymentStatus;
  senderPaymentStatus?: SenderPaymentStatus;
  receiverCollectionStatus?: ReceiverCollectionStatus;
  images?: OrderImage[];
  events?: OrderEvent[];
  notifications?: Notification[];
  rating?: RiderRating | null;
  riderRating?: RiderRating | null;
  report?: RiderReport | null;
  riderReport?: RiderReport | null;
  companyAccountName?: string | null;
  companyAccountNumber?: string | null;
  companyBankName?: string | null;
};

export type DeliveryZone = { id: string; name: string; fee: number | string; active: boolean; updatedAt?: string };
export type DeliveryZoneImportRow = { locationCode: string; locationName: string; deliveryFee: number | string; status: "ACTIVE" | "INACTIVE" };
export type DeliveryZoneImportChange = { locationId: string; location: string; oldFee: number | string; newFee: number | string; changeType: "UPDATED" };
export type DeliveryZoneImportError = { row: number; locationId?: string; errors: string[] };
export type DeliveryZoneImport = { importId: string; summary: { total: number; updated: number; unchanged: number; invalid: number }; changes: DeliveryZoneImportChange[]; errors: DeliveryZoneImportError[]; applied: boolean };

export type Rider = User & {
  active?: boolean;
  assignedOrders?: number;
  averageRating?: number;
  totalRatings?: number;
  totalDeliveries?: number;
  ratingDistribution?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
};

export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type PaginatedResponse<T> = { items: T[]; pagination: Pagination };

export type LoginResponse = { user?: User; token?: string; accessToken?: string };

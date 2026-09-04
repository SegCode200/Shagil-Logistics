export type Role = "OWNER" | "STATION_MANAGER" | "RIDER";
export type StationStatus = "ACTIVE" | "INACTIVE";
export type OrderStatus =
  | "PENDING"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentMethod = "ALREADY_PAID" | "PAYMENT_ON_DELIVERY";
export type PaymentStatus = "NOT_REQUIRED" | "PENDING" | "PAID";
export type CompanyPaymentStatus = "PENDING" | "PAID";
export type ShopOrderStatus = "NEW" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type FinalPaymentStatus = "PENDING" | "PAID";
export type RiderCommissionStatus = "PENDING" | "PAID";
export type SenderPaymentStatus = "PENDING" | "PAID";
export type ReceiverCollectionStatus = "NOT_COLLECTED" | "COLLECTED";
export type PickupMethod = "SENDER_DROPOFF" | "RIDER_PICKUP";
export type DeliveryType = "NORMAL" | "EXPRESS";
export type AccountDetails = {
  accountName: string;
  accountNumber: string;
  bankName: string;
};
export type CompanySettings = {
  maximumInsuranceValue: number | string;
  fixedDeliveryRate: number | string;
  variableDeliveryRate: number | string;
  shopBaseDeliveryFee: number | string;
  shopIncludedWeightKg: number | string;
  shopExtraWeightFee: number | string;
  riderCommissionRate: number | string;
  expressMultiplier: number | string;
  vat: number | string;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
};
export type StationZoneDistance = {
  deliveryZoneId: string;
  distanceKm: number | string;
};
export type Sender = {
  id: string;
  name: string;
  phone: string;
  accessToken?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type CompanyBike = {
  id: string;
  bikeId: string;
  companyPhoneNumber: string;
  status?: "ACTIVE" | "INACTIVE";
  rider?: { id: string; name: string; phone?: string; active?: boolean } | null;
  station?: { id: string; name: string; stationCode: string } | null;
};

export type OrderImage = {
  id?: string;
  publicUrl?: string;
  url?: string;
  originalFilename?: string;
  name?: string;
};
export type PaymentReceipt = {
  id?: string;
  publicUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
};
export type PublicSenderOrder = {
  orderId: string;
  createdAt?: string;
  senderName?: string | null;
  senderPhoneNumber?: string | null;
  receiverName?: string | null;
  receiverPhoneNumber?: string | null;
  deliveryAddress: string;
  deliveryZone?: { name?: string | null } | null;
  packageNotes?: string | null;
  deliveryFee: number | string;
  paymentMethod: PaymentMethod;
  authorizePayment?: boolean;
  deliveryType?: DeliveryType;
  assignedRiderId?: string | null;
  senderPaymentStatus: SenderPaymentStatus;
  receiverCollectionStatus?: ReceiverCollectionStatus;
  status: OrderStatus;
  assignedRider?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null;
  accountDetails?: AccountDetails | null;
  companyAccountName?: string | null;
  companyAccountNumber?: string | null;
  companyBankName?: string | null;
  stationPhoneNumber?: string | null;
  stationPhone?: string | null;
  station?: {
    managers?: Array<{
      user?: { phone?: string | null } | null;
    }>;
  } | null;
  images?: OrderImage[];
  paymentReceipts?: PaymentReceipt[];
};
export type PublicStation = {
  id: string;
  name: string;
  address?: string | null;
  zoneDistances?: StationZoneDistance[];
};
export type OrderEvent = {
  id: string;
  type: string;
  createdAt: string;
  createdBy?: User | null;
};
export type Notification = {
  id: string;
  type: string;
  status: "SENT" | "FAILED";
  createdAt: string;
};
export type ShopProductImage = {
  id: string;
  productId?: string;
  imageUrl: string;
  publicId?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  createdAt?: string;
};
export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  products?: ShopProduct[];
};
export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  quantity?: number | string | null;
  weightKg?: number | string | null;
  description?: string | null;
  price: number | string;
  isActive?: boolean;
  isFeatured?: boolean;
  categoryId?: string | null;
  category?: ShopCategory | null;
  categoryName?: string | null;
  images: Array<ShopProductImage | string>;
  createdAt?: string;
  updatedAt?: string;
};
export type ShopOrderItem = {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number | string;
  quantity: number;
  subtotal: number | string;
};
export type ShopOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress: string;
  deliveryZoneId: string;
  customerNote?: string | null;
  subtotal: number | string;
  totalWeightKg: number | string;
  deliveryFee: number | string;
  total: number | string;
  paymentMethod?: "PAYMENT_ON_DELIVERY" | "PBD";
  paymentStatus?: string;
  deliveryZone?: DeliveryZone | null;
  deliveryOrderStatus?: string | null;
  deliveryToken?: string | null;
  deliveryCode?: string | null;
  customerDeliveryLink?: string | null;
  rider?: { name?: string | null; phone?: string | null } | null;
  status: ShopOrderStatus;
  createdAt: string;
  updatedAt?: string;
  items: ShopOrderItem[];
};
export type RiderRating = {
  id: string;
  orderId: string;
  riderId?: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};
export type RiderReportStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "DISMISSED";
export type RiderReport = {
  id: string;
  orderId: string;
  riderId?: string;
  reason: string;
  description: string;
  status: RiderReportStatus;
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: Role;
  stationId?: string | null;
  accountDetails?: AccountDetails | null;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
};

export type Station = {
  id: string;
  stationCode: string;
  name: string;
  address?: string | null;
  status: StationStatus;
  zones?: DeliveryZone[];
  managers?: StationManager[];
  riders?: StationRider[];
  companyBikes?: CompanyBike[];
  zoneDistances?: StationZoneDistance[];
  createdAt?: string;
  updatedAt?: string;
};

export type StationManager = {
  id: string;
  userId?: string;
  stationId?: string | null;
  station?: Station | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  assignedAt?: string;
  currentOrders?: number;
};

export type CompanyBikes ={
  id: string;
  bikeId: string;
  companyPhoneNumber: string;
}
export type StationRider = {
  id: string;
  riderId: string;
  name: string;
  phone?: string | null;
  status: string;
  assignedOrders?: number;
  active?: boolean | null;
  riderZones?: DeliveryZone[];
  bikeId?: string | null;
  companyBikes?: CompanyBikes;
  ratingsReceived?: RiderRating[];
};

export type Order = {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
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
  notes?: string;
  packageNotes?: string;
  pickupMethod?: PickupMethod;
  pickupAddress?: string;
  pickupInstructions?: string;
  deliveryZoneId?: string;
  stationId?: string;
  deliveryZone?: DeliveryZone | null;
  station?: Station | null;
  bikeId?: string | null;
  companyBikeId?: string | null;
  managedBy?: User | null;
  paymentMethod?: PaymentMethod;
  authorizedPayment?: boolean;
  deliveryType?: DeliveryType;
  paymentStatus?: PaymentStatus;
  deliveryFee?: number | string;
  totalAmountToCollect?: number | string;
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
  finalPaymentStatus?: FinalPaymentStatus;
  riderCommission?: number | string | null;
  riderCommissionStatus?: RiderCommissionStatus;
  senderPaymentStatus?: SenderPaymentStatus;
  receiverCollectionStatus?: ReceiverCollectionStatus;
  maximumInsuranceValue?: boolean;
  images?: OrderImage[];
  paymentReceipts?: PaymentReceipt[];
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

export type RiderCommissionDelivery = {
  orderId: string;
  date?: string | Date | null;
  commission: number | string;
  paymentStatus?: RiderCommissionStatus;
  companyPaymentStatus?: CompanyPaymentStatus;
};

export type RiderCommissionSummary = {
  riderId: string;
  todayCommission: number | string;
  monthCommission: number | string;
  totalCommission: number | string;
  paidCommission: number | string;
  deliveries: RiderCommissionDelivery[];
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number | string;
  active: boolean;
  station?: Station | null;
  stationId?: string | null;
  updatedAt?: string;
};
export type DeliveryZoneImportRow = {
  locationCode: string;
  locationName: string;
  deliveryFee: number | string;
  status: "ACTIVE" | "INACTIVE";
};
export type DeliveryZoneImportChange = {
  locationId: string;
  location: string;
  oldFee: number | string;
  newFee: number | string;
  changeType: "UPDATED";
};
export type DeliveryZoneImportError = {
  row: number;
  locationId?: string;
  errors: string[];
};
export type DeliveryZoneImport = {
  importId: string;
  summary: {
    total: number;
    updated: number;
    unchanged: number;
    invalid: number;
  };
  changes: DeliveryZoneImportChange[];
  errors: DeliveryZoneImportError[];
  applied: boolean;
};

export type Rider = Omit<User, "stationId"> & {
  address?: string | null;
  zoneIds?: string[];
  zones?: DeliveryZone[];
  active?: boolean;
  assignedOrders?: number;
  averageRating?: number;
  totalRatings?: number;
  totalDeliveries?: number;
  bikeId?: string | null;
  bike?: CompanyBikes;
  ratingDistribution?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type PaginatedResponse<T> = { items: T[]; pagination: Pagination };

export type LoginResponse = {
  user?: User;
  token?: string;
  accessToken?: string;
};

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
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID";
export type PickupMethod = "SENDER_DROP_OFF" | "RIDER_PICKUP";

export type User = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: Role;
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
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  packageDescription?: string;
  quantity?: number;
  notes?: string;
  pickupMethod?: PickupMethod;
  pickupAddress?: string;
  pickupInstructions?: string;
  deliveryZone?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  orderAmount?: number | string;
  deliveryFee?: number | string;
  totalAmount?: number | string;
  senderAmount?: number | string;
  companyDeliveryAmount?: number | string;
  publicToken?: string;
  deliveryToken?: string;
};

export type DeliveryZone = { id: string; name: string; fee: number | string; active: boolean };

export type Rider = User & {
  active?: boolean;
  assignedOrders?: number;
};

export type LoginResponse = { user?: User; token?: string; accessToken?: string };

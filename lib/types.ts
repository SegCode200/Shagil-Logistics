export type Role = "OWNER" | "RIDER";
export type OrderStatus = "PENDING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

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
};

export type Rider = User & {
  active?: boolean;
  assignedOrders?: number;
};

export type LoginResponse = { user?: User; token?: string; accessToken?: string };

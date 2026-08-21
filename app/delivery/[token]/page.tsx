"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

const timeline = ["PENDING", "APPROVED", "PACKAGE_RECEIVED", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
const labels: Record<string, string> = { PENDING: "Order created", APPROVED: "Approved", PACKAGE_RECEIVED: "Package received", ASSIGNED: "Rider assigned", PICKED_UP: "Package picked up", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered" };
export default function CustomerDeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const query = useQuery({ queryKey: ["customer-delivery", token], queryFn: () => api.getCustomerDelivery(token), refetchInterval: 30000 });
  useEffect(() => { document.title = "Track your Shagil delivery"; }, []);
  if (query.isLoading) return <LoadingState label="Loading delivery" />;
  if (query.isError || !query.data) return <main className="public-page"><div className="public-card"><p className="eyebrow">Shagil</p><h1>Delivery link unavailable</h1><p className="subtext">This link may be invalid or expired.</p></div></main>;
  const order = query.data;
  const current = timeline.indexOf(order.status);
  const amount = order.totalAmount ?? order.amount;
  return <main className="public-page"><div className="public-card delivery-public"><header className="public-header"><p className="eyebrow">Your delivery</p><h1>{order.orderId || "Delivery"}</h1><span className="delivery-status">{labels[order.status] || order.status}</span></header><div className="public-facts"><div><span>Delivery code</span><strong>{order.deliveryCode || "Provided by sender"}</strong></div><div><span>Account / sender</span><strong>{order.senderName || order.customerName}</strong></div><div><span>Payment</span><strong>{order.paymentMethod === "PAYMENT_ON_DELIVERY" ? "Payment on delivery" : "Already paid"}</strong></div>{order.paymentMethod === "PAYMENT_ON_DELIVERY" && <div><span>Amount to pay</span><strong>₦{Number(amount || 0).toLocaleString()}</strong></div>}</div><div className="timeline">{timeline.map((status, index) => <div className={index <= current ? "timeline-item complete" : "timeline-item"} key={status}>{index <= current ? <CheckCircle2 size={19} /> : <Circle size={19} />}<span>{labels[status]}</span></div>)}</div><p className="public-refresh">Status refreshes automatically.</p></div></main>;
}

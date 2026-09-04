"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Plus, UserRound } from "lucide-react";
import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, LoadingState, formatDate } from "@/components/ui/primitives";

type Props = { params: Promise<{ token: string }> };

const labels: Record<string, string> = {
  PENDING: "Pending review",
  PENDING_APPROVAL: "Pending review",
  APPROVED: "Approved",
  ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function SenderAccessPage({ params }: Props) {
  const { token } = use(params);
  const senderOrders = useQuery({
    queryKey: ["public-sender-orders", token],
    queryFn: () => api.getPublicSenderOrders(token),
  });

  useEffect(() => {
    document.title = "Your Shagil orders";
  }, []);

  if (senderOrders.isLoading) return <LoadingState label="Loading your orders" />;

  if (senderOrders.isError)
    return (
      <main className="public-page">
        <div className="public-card">
          <h1>Delivery unavailable</h1>
          <p className="subtext">This link may be invalid or expired.</p>
        </div>
      </main>
    );

  const orders = senderOrders.data || [];

  return (
    <main className="public-page">
      <div className="public-card sender-public">
        <header className="public-header">
          <div className="public-header-actions">
            <div>
              <h1 className="sender-list-title">Delivery List</h1>
            </div>
            <Link className="button button-primary" href={`/order?token=${encodeURIComponent(token)}`}>
              <Plus size={16} /> Create Delivery 
            </Link>
          </div>
          <p className="subtext">
            Select an delivery to view its details and current status.
          </p>
        </header>

        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Create a delivery request to see it here."
            // action={
            //   <Link className="button button-primary" href={`/order?token=${encodeURIComponent(token)}`}>
            //     <Plus size={16} /> Create Delivery
            //   </Link>
            // }
          />
        ) : (
          <section className="sender-order-history" aria-label="Sender orders">
            <div className="stack-list">
              {orders.map((order) => (
                <article className="sender-order-list-item" key={order.orderId}>
                <Link
                  className="sender-order-link"
                  href={`/sender/${token}/orders/${encodeURIComponent(order.orderId)}`}
                >
                  <div className="sender-order-topline">
                    <div className="sender-order-main">
                      <strong>{order.orderId}</strong>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                    <span className={`status status-${order.status.toLowerCase()}`}>
                      {labels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="sender-order-destination">
                    <MapPin size={16} aria-hidden="true" />
                    <div>
                      <small>{order.deliveryZone?.name || "Delivery area not set"}</small>
                      <strong>{order.deliveryAddress}</strong>
                    </div>
                  </div>
                  <div className="sender-order-meta">
                    <span><UserRound size={14} aria-hidden="true" /><b>Receiver</b>{order.receiverName || "Not provided"}</span>
                    <span><b>Delivery fee</b>₦{Number(order.deliveryFee || 0).toLocaleString()}</span>
                  </div>
                  <span className="sender-order-view">View delivery <ChevronRight size={17} /></span>
                </Link>
                {order.paymentMethod === "ALREADY_PAID" && order.status === "PENDING_APPROVAL" && order.authorizePayment === true ? (
                  <Link
                    className="button button-primary sender-payment-link"
                    href={`/sender/${token}/orders/${encodeURIComponent(order.orderId)}`}
                  >
                    Payment
                  </Link>
                ) : null}
                </article>
              ))}
            </div>
          </section>
        )}

        
      </div>
    </main>
  );
}

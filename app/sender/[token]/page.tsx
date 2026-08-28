"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, LoadingState } from "@/components/ui/primitives";

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
          <p className="eyebrow">Shagil sender access</p>
          <h1>Deliveries unavailable</h1>
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
            Select an order to view its delivery details and current status.
          </p>
        </header>

        {orders.length === 0 ? (
          <EmptyState
            title="No Deliveries yet"
            description="Create a delivery request to see it here."
            // action={
            //   <Link className="button button-primary" href={`/order?token=${encodeURIComponent(token)}`}>
            //     <Plus size={16} /> Create Delivery
            //   </Link>
            // }
          />
        ) : (
          <section className="sender-order-history" aria-label="Sender orders">
            <div className="sender-order-list-heading">
              <h2>Recent deliveries</h2>
              <span>{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
            </div>
            <div className="stack-list">
              {orders.map((order) => (
                <Link
                  className="sender-order-link"
                  href={`/sender/${token}/orders/${encodeURIComponent(order.orderId)}`}
                  key={order.orderId}
                >
                  <div className="sender-order-main">
                    <div className="sender-order-heading">
                      <strong>{order.orderId}</strong>
                      <span className={`status status-${order.status.toLowerCase()}`}>
                        {labels[order.status] || order.status}
                      </span>
                    </div>
                    <span className="sender-order-destination-label">Delivering to</span>
                    <span className="sender-order-destination">{order.deliveryZone?.name || "Delivery area not set"}</span>
                    <small>{order.deliveryAddress}</small>
                  </div>
                  <div className="sender-order-meta">
                    <span><b>Receiver</b>{order.receiverName || "—"}</span>
                    <span><b>Fee</b>₦{Number(order.deliveryFee).toLocaleString()}</span>
                  </div>
                  <span className="sender-order-open">View details <ArrowUpRight size={15} /></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

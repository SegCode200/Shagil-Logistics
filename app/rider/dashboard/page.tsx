"use client";

import Link from "next/link";
import { MapPin, ArrowRight, Phone, Wallet } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
} from "@/components/ui/primitives";

export default function RiderDashboard() {
  const { user, isLoading: authLoading } = useRoleRedirect("RIDER");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["rider-orders", page],
    queryFn: () => api.getRiderOrders(page, 10),
    enabled: Boolean(user),
  });
  const ratingQuery = useQuery({ queryKey: ["rider-ratings"], queryFn: api.getRiderRatings, enabled: Boolean(user) });
  if (authLoading || !user) return <LoadingState />;
  const orders = query.data?.items || [];
  return (
    <AppShell role="RIDER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Your route</p>
            <h1>My deliveries</h1>
            <p className="subtext">Keep it simple. One delivery at a time.</p>
          </div>
        </header>
        <section className="rider-rating-card"><span>My rating</span><strong>{ratingQuery.data?.length ? `★ ${(ratingQuery.data.reduce((total, item) => total + item.rating, 0) / ratingQuery.data.length).toFixed(1)} / 5` : "No ratings yet"}</strong><small>{ratingQuery.data?.length || 0} ratings</small></section>
        {query.isLoading ? (
          <LoadingState label="Loading deliveries" />
        ) : query.isError ? (
          <ErrorState />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No deliveries assigned to you"
            description="New deliveries will appear here when they are ready."
          />
        ) : (
          <div className="delivery-list">
            {orders.map((order) => (
              <article className="panel rider-delivery-card" key={order.id}>
                <header className="card-row">
                  <div>
                    <h3>{order.customerName}</h3>
                    <p className="order-ref">{order.orderId || order.id}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </header>
                <p className="address">
                  <MapPin size={15} /> {order.deliveryAddress}
                </p>
                <div className="rider-facts">
                  <span><strong>Receiver</strong>{order.receiverName || order.customerName}</span>
                  <span><strong>Phone</strong>{order.receiverPhone ? <a href={`tel:${order.receiverPhone}`}><Phone size={13} /> {order.receiverPhone}</a> : "—"}</span>
                  <span><strong>Payment</strong><span><Wallet size={13} /> {order.paymentMethod === "PAYMENT_ON_DELIVERY" ? `Collect ₦${Number(order.totalAmount ?? order.amount ?? 0).toLocaleString()}` : "Already paid"}</span></span>
                </div>
                {order.status !== "DELIVERED" &&
                  order.status !== "CANCELLED" && (
                    <Link
                      href={`/rider/deliveries/${order.orderId || order.id}/confirm`}
                      className="button button-primary button-full"
                    >
                      Confirm delivery <ArrowRight size={17} />
                    </Link>
                  )}
              </article>
            ))}
          </div>
        )}
        {query.data && query.data.pagination.totalPages > 1 && (
          <div className="pagination"><button className="button button-secondary" disabled={page === 1 || query.isFetching} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {query.data.pagination.totalPages}</span><button className="button button-secondary" disabled={page >= query.data.pagination.totalPages || query.isFetching} onClick={() => setPage((current) => current + 1)}>Next</button></div>
        )}
      </div>
    </AppShell>
  );
}

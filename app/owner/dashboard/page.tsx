"use client";

import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  formatDate,
} from "@/components/ui/primitives";

export default function OwnerDashboard() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(1, 8),
    enabled: Boolean(user),
  });
  if (authLoading || !user) return <LoadingState />;
  const items = orders.data?.items || [];
  const counts = {
    total: items.length,
    pendingApproval: items.filter((o) =>
      ["PENDING", "PENDING_APPROVAL"].includes(o.status),
    ).length,
    assigned: items.filter((o) => ["APPROVED"].includes(o.status)).length,
    pickedUp: items.filter((o) => o.status === "PICKED_UP").length,
    delivered: items.filter((o) => o.status === "DELIVERED").length,
    express: items.filter((o) => o.deliveryType === "EXPRESS").length,
    cod: items.filter((o) => o.paymentMethod === "PAYMENT_ON_DELIVERY").length,
    approved: items.filter(
      (o) => o.approvalStatus === "APPROVED" || o.status === "APPROVED",
    ).length,
    pendingCompany: items.filter((o) => o.companyPaymentStatus !== "PAID")
      .length,
    pendingSender: items.filter((o) => o.senderPaymentStatus !== "PAID").length,
  };
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Good morning, {user.name.split(" ")[0]}</p>
            <h1>Today at a glance</h1>
            <p className="subtext">
              A clear view of what needs your attention.
            </p>
          </div>
          <Link className="button button-primary" href="/create-order">
            <Plus size={18} /> Create order
          </Link>
        </header>
        <div className="summary-grid summary-grid-primary">
          {[
            ["Orders today", counts.total, ""],
            ["Pending approval", counts.pendingApproval, ""],
            ["Assigned", counts.assigned, "dot-blue"],
            ["Picked up", counts.pickedUp, "dot-blue"],
            ["Delivered", counts.delivered, "dot-green"],
            ["Express delivery", counts.express, "dot-blue"],
          ].map(([label, value, dot]) => (
            <Link
              className="summary-card summary-card-link"
              href={
                label === "Orders today"
                  ? "/owner/orders"
                  : label === "Pending approval"
                    ? "/owner/orders?status=PENDING_APPROVAL"
                    : label === "Assigned"
                      ? "/owner/orders?status=APPROVED"
                      : label === "Picked up"
                        ? "/owner/orders?status=PICKED_UP"
                        : "/owner/orders?status=DELIVERED"
              }
              key={label as string}
            >
              <span className={`summary-dot ${dot}`} />
              <strong>{value}</strong>
              <span>{label}</span>
              <ArrowUpRight className="summary-card-arrow" size={16} />
            </Link>
          ))}
        </div>
        <div className="summary-grid summary-grid-secondary">
          {[
            ["Pending company payments", counts.pendingCompany],
            ["Pending sender payments", counts.pendingSender],
          ].map(([label, value]) => (
            <Link
              className="summary-card summary-card-secondary summary-card-link"
              href={
                label === "Picked up"
                  ? "/owner/orders?status=PICKED_UP"
                  : label === "Pending company payments"
                    ? "/owner/orders?paymentStatus=PENDING"
                    : "/owner/orders?paymentStatus=PENDING"
              }
              key={label}
            >
              <span>{label}</span>
              <strong>{value}</strong>
              <ArrowUpRight className="summary-card-arrow" size={16} />
            </Link>
          ))}
        </div>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent orders</h2>
            <Link href="/owner/orders" className="text-link">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {orders.isLoading ? (
            <LoadingState label="Loading orders" />
          ) : orders.isError ? (
            <ErrorState />
          ) : items.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Create your first order to get started."
              action={
                <Link className="button button-primary" href="/create-order">
                  Create order
                </Link>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Sender</th>
                    <th>Rider</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td className="order-ref">{order.orderId || order.id}</td>
                      <td>{order.senderName}</td>
                      <td className="muted">
                        {order.rider?.name || "Unassigned"}
                      </td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="muted">{formatDate(order.createdAt)}</td>
                      <td>
                        <Link
                          href={`/owner/orders/${order.orderId}`}
                          className="text-link"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

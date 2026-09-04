"use client";

import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: api.getAllOrders,
    enabled: Boolean(user),
  });
  if (authLoading || !user) return <LoadingState />;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const allOrders = orders.data || [];
  const filteredOrders = allOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const orderKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")}`;
    return (!fromDate || orderKey >= fromDate) && (!toDate || orderKey <= toDate);
  });
  const todayOrders = allOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")}` === todayKey;
  });
  const displayOrders = fromDate || toDate ? filteredOrders : todayOrders;
  const expectedTotal = filteredOrders.reduce(
    (sum, order) => sum + Number(order.totalAmountToCollect ?? order.deliveryFee ?? 0),
    0,
  );
  const actualTotal = filteredOrders.reduce((sum, order) => {
    const isPaid = order.finalPaymentStatus === "PAID" || order.senderPaymentStatus === "PAID" || order.paymentStatus === "PAID";
    return sum + (isPaid ? Number(order.totalAmountToCollect ?? order.deliveryFee ?? 0) : 0);
  }, 0);
  const balanceTotal = Math.max(0, expectedTotal - actualTotal);
  const counts = {
    total: todayOrders.length,
    transactions: filteredOrders.length,
    expectedTotal,
    actualTotal,
    balanceTotal,
    pendingApproval: allOrders.filter((o) =>
      ["PENDING", "PENDING_APPROVAL"].includes(o.status),
    ).length,
    assigned: allOrders.filter((o) => ["APPROVED"].includes(o.status)).length,
    pickedUp: allOrders.filter((o) => o.status === "PICKED_UP").length,
    delivered: allOrders.filter((o) => o.status === "DELIVERED").length,
    express: allOrders.filter((o) => o.deliveryType === "EXPRESS").length,
    podPendingReconciliation: filteredOrders.filter(
      (o) => o.paymentMethod === "PAYMENT_ON_DELIVERY" && o.finalPaymentStatus !== "PAID",
    ).length,
    reconciledPod: filteredOrders.filter(
      (o) => o.paymentMethod === "PAYMENT_ON_DELIVERY" && o.finalPaymentStatus === "PAID",
    ).length,
    pbdPendingReconciliation: filteredOrders.filter(
      (o) => o.paymentMethod === "ALREADY_PAID" && o.finalPaymentStatus !== "PAID",
    ).length,
    reconciledPbd: filteredOrders.filter(
      (o) => o.paymentMethod === "ALREADY_PAID" && o.finalPaymentStatus === "PAID",
    ).length,
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
                  ? `/owner/orders?date=${todayKey}`
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
        <div className="dashboard-transaction-filter">
          <label htmlFor="dashboard-from-date">Transactions from</label>
          <input
            id="dashboard-from-date"
            type="date"
            value={fromDate}
            max={todayKey}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <label htmlFor="dashboard-to-date">to</label>
          <input
            id="dashboard-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={todayKey}
            onChange={(event) => setToDate(event.target.value)}
          />
          {fromDate || toDate ? <button type="button" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button> : null}
          <span>Choose a date range</span>
        </div>
        <div className="summary-grid summary-grid-secondary">
          {[
            ["Total transactions", counts.transactions, `₦${Number(counts.expectedTotal).toLocaleString()}`, "transactions"],
            ["Expected total", null, `₦${Number(counts.expectedTotal).toLocaleString()}`, "expected"],
            ["Actual total", null, `₦${Number(counts.actualTotal).toLocaleString()}`, "actual"],
            ["Balance total", null, `₦${Number(counts.balanceTotal).toLocaleString()}`, "balance"],
            ["POD pending reconciliation", counts.podPendingReconciliation, null, "pod-pending"],
            ["Reconciled POD", counts.reconciledPod, null, "pod-paid"],
            ["PBD pending reconciliation", counts.pbdPendingReconciliation, null, "pbd-pending"],
            ["Reconciled PBD", counts.reconciledPbd, null, "pbd-paid"],
          ].map(([label, value, amount, transaction]) => (
            <Link
              className="summary-card summary-card-secondary summary-card-link"
              href={`/owner/orders?${[
                fromDate ? `fromDate=${fromDate}` : "",
                toDate ? `toDate=${toDate}` : "",
                transaction === "pod-pending" ? "payment=PAYMENT_ON_DELIVERY&finalPaymentStatus=PENDING" : "",
                transaction === "pod-paid" ? "payment=PAYMENT_ON_DELIVERY&finalPaymentStatus=PAID" : "",
                transaction === "pbd-pending" ? "payment=ALREADY_PAID&finalPaymentStatus=PENDING" : "",
                transaction === "pbd-paid" ? "payment=ALREADY_PAID&finalPaymentStatus=PAID" : "",
                ["transactions", "expected", "actual", "balance"].includes(transaction as string)
                  ? `transaction=${transaction}`
                  : "",
              ].filter(Boolean).join("&")}`}
              key={label}
            >
              <span>{label}</span>
              <strong>{amount === null ? value : value === null ? amount : `${value} · ${amount}`}</strong>
              <ArrowUpRight className="summary-card-arrow" size={16} />
            </Link>
          ))}
        </div>
        <section className="panel">
          <div className="panel-heading">
            <h2>{fromDate || toDate ? "Orders in selected period" : "Recent orders"}</h2>
            <Link href="/owner/orders" className="text-link">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {orders.isLoading ? (
            <LoadingState label="Loading orders" />
          ) : orders.isError ? (
            <ErrorState />
          ) : displayOrders.length === 0 ? (
            <EmptyState
              title={fromDate || toDate ? "No orders in selected period" : "No orders yet"}
              description={fromDate || toDate ? "Try another date range." : "Create your first order to get started."}
              action={
                <Link className="button button-primary" href="/create-order">
                  Create order
                </Link>
              }
            />
          ) : (
            <>
            <div className="table-wrap desktop-table">
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
                  {displayOrders.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td className="order-ref">{order.orderId || order.id}</td>
                      <td>{order.senderName}</td>
                      <td className="muted">
                        {order.assignedRider?.name || "Unassigned"}
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
            <div className="mobile-order-list">
              {displayOrders.slice(0, 8).map((order) => (
                <Link
                  className="mobile-order-card"
                  href={`/owner/orders/${order.orderId}`}
                  key={order.id}
                >
                  <div className="mobile-order-main">
                    <strong className="order-ref">{order.orderId || order.id}</strong>
                    <span className="muted">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="mobile-order-row mobile-order-row-tight">
                    <span className="mobile-order-label">Sender</span>
                    <span className="mobile-order-value">
                      {order.senderName || order.customerName || "—"}
                    </span>
                  </div>
                  <div className="mobile-order-row mobile-order-row-tight">
                    <span className="mobile-order-label">Payment</span>
                    <span className={`mini-status mini-status-${order.paymentMethod === "PAYMENT_ON_DELIVERY" ? "pending" : "paid"}`}>
                      {order.paymentMethod === "PAYMENT_ON_DELIVERY" ? "POD" : "PBD"}
                    </span>
                  </div>
                  <div className="mobile-order-row mobile-order-row-tight">
                    <span className="mobile-order-label">Delivery</span>
                    <span className={`delivery-type-badge delivery-type-${(order.deliveryType || "NORMAL").toLowerCase()}`}>
                      {(order.deliveryType || "NORMAL") === "EXPRESS" ? "EXP" : "NOR"}
                    </span>
                  </div>
                  <div className="mobile-order-row mobile-order-row-tight">
                    <span className="mobile-order-label">Rider</span>
                    <span className="mobile-order-value">
                      {order.assignedRider?.name || order.rider?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="mobile-order-row">
                    <span className="mobile-order-address">
                      {order.deliveryAddress || "Delivery address"}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

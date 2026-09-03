"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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

function ManagerOrdersContent() {
  const { user, isLoading } = useRoleRedirect("STATION_MANAGER");
  const [search, setSearch] = useState("");
  const params = useSearchParams();
  const requestedStatus = params.get("status");
  const assignment = params.get("assignment");
  const riderId = params.get("riderId");
  const fromDate = params.get("fromDate") || "";
  const transaction = params.get("transaction") || "";
  const payment = params.get("payment") || "";
  const finalPaymentStatus = params.get("finalPaymentStatus") || "";
  const orders = useQuery({
    queryKey: ["managerOrders"],
    queryFn: api.getManagerOrders,
    enabled: Boolean(user),
  });
  if (isLoading || !user) return <LoadingState />;
  const items = orders.data || [];
  const filtered = items.filter((order) => {
    const matchesSearch = `${order.orderId} ${order.id} ${order.deliveryZone?.name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = !requestedStatus || order.status === requestedStatus;
    const matchesAssignment =
      !assignment ||
      (assignment === "manager" ? !order.managedBy : !order.assignedRider && !order.rider);
    const assignedRiderId = order.assignedRider?.id || order.rider?.id;
    const matchesRider = !riderId || assignedRiderId === riderId;
    const matchesDate = !fromDate || order.createdAt.slice(0, 10) >= fromDate;
    const matchesPayment = !payment || order.paymentMethod === payment;
    const matchesFinalPaymentStatus =
      !finalPaymentStatus || order.finalPaymentStatus === finalPaymentStatus;
    const isPaid = order.finalPaymentStatus === "PAID" || order.senderPaymentStatus === "PAID" || order.paymentStatus === "PAID";
    const matchesTransaction =
      !transaction || transaction === "expected" || transaction === "transactions" ||
      (transaction === "actual" && isPaid) ||
      (transaction === "balance" && !isPaid);
    return matchesSearch && matchesStatus && matchesAssignment && matchesRider && matchesDate &&
      matchesPayment && matchesFinalPaymentStatus && matchesTransaction;
  });
  return (
    <AppShell role="STATION_MANAGER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Station operations</p>
            <h1>Orders</h1>
            <p className="subtext">
              Orders returned by the backend for your assigned stations.
            </p>
          </div>
        </header>
        <section className="panel">
          <div className="panel-heading">
            <h2>Operational orders</h2>
            <input
              className="input"
              placeholder="Search order ID or zone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {orders.isLoading ? (
            <LoadingState label="Loading orders" />
          ) : orders.isError ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No orders found."
              description="Orders from your assigned stations will appear here."
            />
          ) : (
            <>
            <div className="table-wrap desktop-table">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Zone</th>
                    <th>Station</th>
                    <th>Type</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Rider</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr key={order.id}>
                      <td className="order-ref">{order.orderId || order.id}</td>
                      <td>
                        {order.deliveryZone?.name || order.deliveryAddress}
                      </td>
                      <td>{order.station?.name || "-"}</td>
                      <td>
                        <span
                          className={`delivery-type-badge delivery-type-${(order.deliveryType || "NORMAL").toLowerCase()}`}
                        >
                          {(order.deliveryType || "NORMAL").slice(0, 3).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {order.paymentMethod === "PAYMENT_ON_DELIVERY"
                          ? "POD"
                          : order.paymentMethod === "ALREADY_PAID"
                            ? "PBD"
                            : "-"}
                      </td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td>
                        {order.assignedRider?.name ||
                          order.rider?.name ||
                          "Unassigned"}
                      </td>
                      <td className="muted">{formatDate(order.createdAt)}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/manager/orders/${order.orderId}`}
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
              {filtered.map((order) => (
                <Link
                  className="mobile-order-card"
                  href={`/manager/orders/${order.orderId}`}
                  key={order.id}
                >
                  <div className="mobile-order-main">
                    <strong className="order-ref">{order.orderId || order.id}</strong>
                    <span className="muted">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="mobile-order-row mobile-order-row-tight">
                    <span className="mobile-order-label">Zone</span>
                    <span className="mobile-order-value">{order.deliveryZone?.name || order.deliveryAddress}</span>
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
                    <span className="mobile-order-value">{order.assignedRider?.name || order.rider?.name || "Unassigned"}</span>
                  </div>
                  <div className="mobile-order-row">
                    <span className="mobile-order-address">{order.deliveryAddress || "Delivery address"}</span>
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

export default function ManagerOrdersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading orders" />}>
      <ManagerOrdersContent />
    </Suspense>
  );
}

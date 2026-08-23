"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
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

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: api.getOrders,
    enabled: Boolean(user),
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [rider, setRider] = useState("ALL");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("newest");
  const riders = useQuery({ queryKey: ["riders"], queryFn: api.getRiders, enabled: Boolean(user) });
  const filtered = useMemo(
    () =>
      (query.data || []).filter(
        (order) =>
          `${order.orderId} ${order.customerName} ${order.senderName || ""} ${order.receiverName || ""} ${order.receiverPhoneNumber || ""} ${order.rider?.name || order.assignedRider?.name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (status === "ALL" || order.status === status) &&
          (payment === "ALL" || order.paymentMethod === payment) &&
              (rider === "ALL" || order.assignedRider?.id === rider || order.rider?.id === rider) &&
              (!date || order.createdAt.slice(0, 10) === date),
            ).sort((left, right) => sort === "oldest" ? left.createdAt.localeCompare(right.createdAt) : right.createdAt.localeCompare(left.createdAt)),
            [query.data, search, status, payment, rider, date, sort],
  );
  if (authLoading || !user) return <LoadingState />;
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h1>Orders</h1>
            <p className="subtext">
              Track every order from creation to confirmation.
            </p>
          </div>
          <Link className="button button-primary" href="/create-order">
            <Plus size={18} /> Create order
          </Link>
        </header>
        <section className="panel">
          <div className="panel-heading">
            <div className="filters">
              <div className="input-icon search">
                <Search size={16} />
                <input
                  className="input"
                  placeholder="Search orders"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="select filter-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
                <option value="WAITING_FOR_PACKAGE">Waiting for package</option>
                <option value="PACKAGE_RECEIVED">Package received</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="PICKED_UP">Picked up</option>
                <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select className="select filter-select" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="ALL">All payments</option>
                <option value="ALREADY_PAID">Already paid</option>
                <option value="PAYMENT_ON_DELIVERY">Payment on delivery</option>
              </select>
              <select className="select filter-select" value={rider} onChange={(e) => setRider(e.target.value)}>
                <option value="ALL">All riders</option>
                {(riders.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input className="input filter-date" type="date" aria-label="Filter by date" value={date} onChange={(e) => setDate(e.target.value)} />
              <select className="select filter-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort orders">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
            <span className="muted count-label">{filtered.length} orders</span>
          </div>
          {query.isLoading ? (
            <LoadingState label="Loading orders" />
          ) : query.isError ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching orders"
              description="Try another search or create a new order."
            />
          ) : (
            <>
              <div className="table-wrap desktop-table">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Sender</th>
                      <th>Receiver</th>
                      <th>Delivery</th>
                      <th>Rider</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => (
                      <tr key={order.id}>
                        <td className="order-ref">
                          {order.orderId || order.id}
                        </td>
                        <td>{order.senderName || order.customerName}<small className="muted block">{order.senderPhoneNumber || order.customerPhone}</small></td>
                        <td>{order.receiverName || order.customerName}<small className="muted block">{order.receiverPhoneNumber || order.customerPhone}</small></td>
                        <td className="location-cell"><strong>{order.deliveryAddress}</strong><small className="muted block">{order.deliveryFee != null ? ` · ₦${Number(order.deliveryFee).toLocaleString()}` : ""}</small></td>
                        <td className="muted">
                          {order.rider?.name || "Unassigned"}
                        </td>
                        <td>{order.paymentMethod === "PAYMENT_ON_DELIVERY" ? "COD" : "Paid"}<small className="muted block">{order.companyDeliveryAmount == null ? "—" : `₦${Number(order.companyDeliveryAmount).toLocaleString()}`}</small></td>
                        <td>
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="muted">{formatDate(order.createdAt)}</td>
                        <td>
                          <Link
                            href={`/owner/orders/${order.id}`}
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
                {filtered.map((order) => (
                  <article className="mobile-order-card" key={order.id}>
                    <header>
                      <strong className="order-ref">
                        {order.orderId || order.id}
                      </strong>
                      <OrderStatusBadge status={order.status} />
                    </header>
                    <p>{order.customerName}</p>
                    <footer>
                      <span>{formatDate(order.createdAt)}</span>
                      <Link
                        href={`/owner/orders/${order.id}`}
                        className="text-link"
                      >
                        Open
                      </Link>
                    </footer>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

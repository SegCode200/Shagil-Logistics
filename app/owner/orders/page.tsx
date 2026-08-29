"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function OrdersContent() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["orders", page],
    queryFn: () => api.getOrders(page, 20),
    enabled: Boolean(user),
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [rider, setRider] = useState("ALL");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("newest");
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const requestedPayment = searchParams.get("payment");
  const requestedPaymentStatus = searchParams.get("paymentStatus");
  const activeStatus = status === "ALL" && requestedStatus ? requestedStatus : status;
  const activePayment = payment === "ALL" && requestedPayment ? requestedPayment : payment;
  const activePaymentStatus = requestedPaymentStatus || "ALL";
  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: api.getRiders,
    enabled: Boolean(user),
  });
  const filtered = useMemo(
    () =>
      (query.data?.items || [])
        .filter(
          (order) =>
            `${order.orderId} ${order.customerName} ${order.senderName || ""} ${order.receiverName || ""} ${order.receiverPhoneNumber || ""} ${order.rider?.name || order.assignedRider?.name || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (activeStatus === "ALL" || order.status === activeStatus) &&
            (activePayment === "ALL" || order.paymentMethod === activePayment) &&
            (activePaymentStatus === "ALL" ||
              order.paymentStatus === activePaymentStatus ||
              order.companyPaymentStatus === activePaymentStatus ||
              order.senderPaymentStatus === activePaymentStatus) &&
            (rider === "ALL" ||
              order.assignedRider?.id === rider ||
              order.rider?.id === rider) &&
            (!date || order.createdAt.slice(0, 10) === date),
        )
        .sort((left, right) =>
          sort === "oldest"
            ? left.createdAt.localeCompare(right.createdAt)
            : right.createdAt.localeCompare(left.createdAt),
        ),
    [query.data, search, activeStatus, activePayment, activePaymentStatus, rider, date, sort],
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
              {/* <select
                className="select filter-select"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option value="ALL">All payments</option>
                <option value="ALREADY_PAID">Already paid</option>
                <option value="PAYMENT_ON_DELIVERY">Payment on delivery</option>
              </select>
              <select
                className="select filter-select"
                value={rider}
                onChange={(e) => setRider(e.target.value)}
              >
                <option value="ALL">All riders</option>
                {(riders.data || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                className="input filter-date"
                type="date"
                aria-label="Filter by date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <select
                className="select filter-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort orders"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select> */}
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
                        <td>
                          {order.senderName || order.customerName}
                          <small className="muted block">
                            {order.senderPhoneNumber || order.customerPhone}
                          </small>
                        </td>
                        <td>
                          {order.receiverName || order.customerName}
                          <small className="muted block">
                            {order.receiverPhoneNumber || order.customerPhone}
                          </small>
                        </td>
                        <td className="location-cell">
                          <strong>{order.deliveryAddress}</strong>
                          <small className="muted block">
                            <span
                              className={`delivery-type-badge delivery-type-${(order.deliveryType || "NORMAL").toLowerCase()}`}
                            >
                              {(order.deliveryType || "NORMAL").slice(0, 3).toUpperCase()}
                            </span>
                            {order.deliveryFee != null
                              ? ` · ₦${Number(order.deliveryFee).toLocaleString()}`
                              : ""}
                          </small>
                        </td>
                        <td className="muted">
                          {order.rider?.name || "Unassigned"}
                        </td>
                        <td>
                          {order.paymentMethod === "PAYMENT_ON_DELIVERY"
                            ? "POD"
                            : "PAID"}
                          <small className="muted block">
                            <span
                              className={`mini-status mini-status-${(order.finalPaymentStatus || "PENDING").toLowerCase()}`}
                            >
                              {order.finalPaymentStatus || "PENDING"}
                            </span>
                          </small>
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
                {filtered.map((order) => (
                  <Link
                    className="mobile-order-card"
                    href={`/owner/orders/${order.orderId}`}
                    key={order.id}
                  >
                    <div className="mobile-order-main">
                      <strong className="order-ref">
                        {order.orderId || order.id}
                      </strong>
                      <span className="muted">{formatDate(order.createdAt)}</span>
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
        {query.data && query.data.pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="button button-secondary"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {query.data.pagination.totalPages} ·{" "}
              {query.data.pagination.total} orders
            </span>
            <button
              className="button button-secondary"
              disabled={
                page >= query.data.pagination.totalPages || query.isFetching
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading orders" />}>
      <OrdersContent />
    </Suspense>
  );
}

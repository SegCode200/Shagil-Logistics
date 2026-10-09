"use client";

import Link from "next/link";
import { MapPin, ArrowRight, Navigation, Phone, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { RiderOrderImages } from "@/components/orders/rider-order-images";
import { RiderPushNotifications } from "@/components/rider/rider-push-notifications";
import { api } from "@/lib/api";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
} from "@/components/ui/primitives";

const formatMoney = (value?: number | string | null) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function RiderDashboard() {
  const { user, isLoading: authLoading } = useRoleRedirect("RIDER");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const searchTerm = search.trim().toLowerCase();
  const query = useQuery({
    queryKey: ["rider-orders", page],
    queryFn: () => api.getRiderOrders(page, 10),
    enabled: Boolean(user),
  });
  const searchQuery = useQuery({
    queryKey: ["rider-orders-search", searchTerm],
    queryFn: async () => {
      const firstPage = await api.getRiderOrders(1, 100);
      if (firstPage.pagination.totalPages <= 1) return firstPage.items;
      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
          api.getRiderOrders(index + 2, 100),
        ),
      );
      return [firstPage, ...remainingPages].flatMap((result) => result.items);
    },
    enabled: Boolean(user && searchTerm),
  });
  const ratingQuery = useQuery({
    queryKey: ["rider-ratings"],
    queryFn: api.getRiderRatings,
    enabled: Boolean(user),
  });
  const commissionQuery = useQuery({
    queryKey: ["rider-commission-summary"],
    queryFn: api.getCommissionSummary,
    enabled: Boolean(user),
  });
  const summary = commissionQuery.data;
  const commissionCards = useMemo(
    () => [
      { label: "Today's commission", value: `₦${formatMoney(summary?.todayCommission)}` },
      { label: "This month", value: `₦${formatMoney(summary?.monthCommission)}` },
      { label: "Total earned", value: `₦${formatMoney(summary?.totalCommission)}` },
      { label: "Paid", value: `₦${formatMoney(summary?.paidCommission)}` },
    ],
    [summary],
  );
  if (authLoading || !user) return <LoadingState />;
  const orders = query.data?.items || [];
  const isSearching = Boolean(searchTerm);
  const matchingOrders = (isSearching ? searchQuery.data || [] : orders).filter(
    (order) => {
      if (order.status === "DELIVERED" && order.finalPaymentStatus === "PAID") {
        return false;
      }
      if (!isSearching) return true;
      const phoneDigits = searchTerm.replace(/\D/g, "");
      const orderIdMatches = (order.orderId || order.id)
        .toLowerCase()
        .includes(searchTerm);
      const receiverPhoneMatches = phoneDigits
        ? (order.receiverPhoneNumber || order.receiverPhone || "")
            .replace(/\D/g, "")
            .includes(phoneDigits)
        : false;
      return orderIdMatches || receiverPhoneMatches;
    },
  );
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
        <section className="rider-summary-grid">
          {commissionCards.map((card) => (
            <div className="rider-summary-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </section>
        <section className="rider-rating-card">
          <span>My rating</span>
          <strong>
            {ratingQuery.data?.length
              ? `★ ${(ratingQuery.data.reduce((total, item) => total + item.rating, 0) / ratingQuery.data.length).toFixed(1)} / 5`
              : "No ratings yet"}
          </strong>
          <small>{ratingQuery.data?.length || 0} ratings</small>
        </section>
        <RiderPushNotifications />
        <div className="input-icon search rider-order-search">
          <Search size={16} aria-hidden="true" />
          <input
            className="input"
            type="search"
            aria-label="Search deliveries by order ID or receiver phone number"
            placeholder="Search by order ID or receiver phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {(isSearching ? searchQuery.isLoading : query.isLoading) ? (
          <LoadingState label="Loading deliveries" />
        ) : (isSearching ? searchQuery.isError : query.isError) ? (
          <ErrorState />
        ) : matchingOrders.length === 0 ? (
          <EmptyState
            title={isSearching ? "No matching deliveries" : "No deliveries assigned to you"}
            description={
              isSearching
                ? "Try a different order ID or receiver phone number."
                : "New deliveries will appear here when they are ready."
            }
          />
        ) : (
          <div className="delivery-list">
            {matchingOrders.map((order) => {
                const pickupAddressVisible = ![
                  "PICKED_UP",
                  "DELIVERED",
                  "CANCELLED",
                ].includes(order.status);

                return (
              <article
                className={`panel rider-delivery-card${order.status === "DELIVERED" ? " rider-delivery-card-delivered" : ""}`}
                key={order.id}
              >
                <header className="card-row">
                  <div>
                    <h3>{order.customerName}</h3>
                    <p className="order-ref">{order.orderId || order.id}</p>
                    <p className="rider-order-receiver-phone">
                      <span>Receiver phone:</span>{" "}
                      {order.receiverPhoneNumber || order.receiverPhone ? (
                        <a href={`tel:${order.receiverPhoneNumber || order.receiverPhone}`}>
                          {order.receiverPhoneNumber || order.receiverPhone}
                        </a>
                      ) : (
                        <strong>Not provided</strong>
                      )}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </header>
                <div className="rider-route-stops">
                  <section className="rider-route-stop rider-route-pickup">
                    <span className="rider-route-label">Pickup</span>
                    <div className="rider-route-detail">
                      <span className="rider-route-detail-label">Pickup name</span>
                      <strong className="rider-route-detail-value">{order.senderName || "Sender"}</strong>
                    </div>
                    {pickupAddressVisible ? (
                      <div className="rider-route-detail">
                        <span className="rider-route-detail-label">Pickup address</span>
                        <p className="rider-route-address">
                          <MapPin size={14} />
                          <strong className="rider-route-detail-value">
                            {order.pickupAddress || "Pickup address unavailable"}
                          </strong>
                        </p>
                        {order.pickupAddress && (
                          <a
                            className="rider-map-link"
                            href={googleMapsDirectionsUrl(order.pickupAddress)}
                          >
                            <Navigation size={14} /> Open in Maps
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="rider-route-complete">Pickup complete</p>
                    )}
                  </section>
                  <section className="rider-route-stop rider-route-delivery rider-receiver-highlight">
                    <span className="rider-route-label">Delivery</span>
                    <div className="rider-route-detail">
                      <span className="rider-route-detail-label">Receiver name</span>
                      <strong className="rider-route-detail-value rider-receiver-name">
                        {order.receiverName || order.customerName}
                      </strong>
                    </div>
                    <div className="rider-route-detail">
                      <span className="rider-route-detail-label">Receiver address</span>
                      <p className="rider-route-address">
                        <MapPin size={14} />
                        <strong className="rider-route-detail-value">{order.deliveryAddress}</strong>
                      </p>
                      {order.deliveryAddress && (
                        <a
                          className="rider-map-link"
                          href={googleMapsDirectionsUrl(
                            [order.deliveryAddress, order.deliveryZone?.name]
                              .filter(Boolean)
                              .join(", "),
                          )}
                        >
                          <Navigation size={14} /> Open in Maps
                        </a>
                      )}
                    </div>
                    <div className="rider-route-detail">
                      <span className="rider-route-detail-label">Delivery zone</span>
                      <strong className="rider-route-detail-value">
                        {order.deliveryZone?.name || "Not provided"}
                      </strong>
                    </div>
                    <div className="rider-receiver-phone">
                      <strong>Receiver phone</strong>
                      {order.receiverPhoneNumber ? (
                        <a href={`tel:${order.receiverPhoneNumber}`}>
                          <Phone size={14} /> {order.receiverPhoneNumber}
                        </a>
                      ) : (
                        <span>Not provided</span>
                      )}
                    </div>
                  </section>
                </div>
                <RiderOrderImages images={order.images} />
                <div className="rider-facts">
                  <span>
                    <strong>Date & time</strong>
                    <span>{formatDateTime(order.deliveredAt || order.createdAt)}</span>
                  </span>
                  <span>
                    <strong>Payment</strong>
                    <span>
                      <Wallet size={13} />{" "}
                      {order.paymentMethod === "PAYMENT_ON_DELIVERY" ? "POD" : "PBD"}
                      {order.paymentMethod === "PAYMENT_ON_DELIVERY"
                        ? ` · ${order.paymentCoverage === "ITEM_AND_DELIVERY" ? "Item + delivery" : "Delivery only"} · Collect ₦${Number(order.paymentCoverage === "ITEM_AND_DELIVERY" ? order.totalAmountToCollect ?? order.deliveryFee ?? 0 : order.deliveryFee ?? 0).toLocaleString()}`
                        : " · Already paid"}
                    </span>
                  </span>
                  {order.riderCommission != null && order.riderCommission !== "" && (
                    <span>
                      <strong>Commission</strong>
                      <span>
                        <Wallet size={13} />₦{formatMoney(order.riderCommission)}
                      </span>
                    </span>
                  )}
                </div>
                {order.status !== "CANCELLED" && (
                  <Link
                    href={`/rider/deliveries/${order.orderId || order.id}/confirm`}
                    className="button button-primary button-full"
                  >
                    {order.status === "DELIVERED" ? "Upload receipt" : "See delivery"} <ArrowRight size={17} />
                  </Link>
                )}
              </article>
                );
            })}
          </div>
        )}
        {!isSearching && query.data && query.data.pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="button button-secondary"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {query.data.pagination.totalPages}
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

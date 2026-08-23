"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Truck, Ban, PackageCheck } from "lucide-react";
import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  formatDate,
} from "@/components/ui/primitives";
import { WhatsAppButton } from "@/components/orders/whatsapp-button";

type Props = { params: Promise<{ orderId: string }> };
export default function OrderDetailsPage({ params }: Props) {
  const { orderId } = use(params);
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: api.getRiders,
    enabled: Boolean(user),
  });
  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Boolean(user),
  });
  
  // use deliveryZoneId to get the delivery zone name from the list of zones, if available
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
    enabled: Boolean(user),
  });
  const zoneName = zones.data?.find((z) => z.id === query.data?.deliveryZoneId)?.name;
  const action = useMutation({
    mutationFn: (type: "approve" | "received" | "out" | "cancel") => {
      if (type === "cancel") return api.cancelOrder(orderId);
      if (type === "out") return api.markOutForDelivery(orderId);
      if (type === "received") return api.markPackageReceived(orderId);
      return api.updateOrderStatus(orderId, "APPROVED");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  if (isLoading || !user || query.isLoading) return <LoadingState />;
  if (query.isError || !query.data)
    return (
      <AppShell role="OWNER">
        <div className="page">
          <ErrorState message="We couldn't load this order." />
        </div>
      </AppShell>
    );
  const order = query.data;
  const amount =
    order.amount == null || order.amount === "" ? null : Number(order.amount);
  const canApprove = Boolean(
    (order.senderName || order.customerName) &&
    (order.receiverName || order.customerName) &&
    order.deliveryAddress &&
    order.paymentMethod &&
    order.deliveryFee != null,
  );
  return (
    <AppShell role="OWNER">
      <div className="page">
        <Link href="/owner/orders" className="back-link">
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <header className="page-header detail-header">
          <div>
            <p className="eyebrow">Order details</p>
            <h1>{order.orderId || order.id}</h1>
            <p className="subtext">Created {formatDate(order.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </header>
        <div className="detail-grid">
          <section className="detail-card">
            <h2>Customer information</h2>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{order.receiverName}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{order.receiverPhoneNumber || "—"}</dd>
              </div>
              <div>
                <dt>Delivery address</dt>
                <dd>{order.deliveryAddress}</dd>
              </div>
            </dl>
            <h2 className="section-gap">Sender and package</h2>
            <dl className="detail-list">
              <div>
                <dt>Sender</dt>
                <dd>{order.senderName }</dd>
              </div>
              <div>
                <dt>Sender phone</dt>
                <dd>{order.senderPhoneNumber || "—"}</dd>
              </div>
              <div>
                <dt>Package</dt>
                <dd>{order.packageDescription || order.orderDetails}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{order.quantity || 1}</dd>
              </div>
              <div>
                <dt>Pickup</dt>
                <dd>
                  {order.pickupMethod === "RIDER_PICKUP"
                    ? order.pickupAddress
                    : "Sender drop-off"}
                </dd>
              </div>
            </dl>
            <h2 className="section-gap">Order information</h2>
            <dl className="detail-list">
              <div>
                <dt>Details</dt>
                <dd>{order.orderDetails}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>
                  {amount !== null && Number.isFinite(amount)
                    ? amount.toFixed(2)
                    : "Not specified"}
                </dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd>{zoneName || "—"}</dd>
              </div>
              <div>
                <dt>Delivery fee</dt>
                <dd>
                  {order.deliveryFee == null
                    ? "—"
                    : `₦${Number(order.deliveryFee).toLocaleString()}`}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>
                  {order.totalAmount == null
                    ? "—"
                    : `₦${Number(order.totalAmount).toLocaleString()}`}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(order.createdAt)}</dd>
              </div>
            </dl>
            {order.images?.length ? (
              <>
                <h2 className="section-gap">Product images</h2>
                <div className="public-image-grid">
                  {order.images.map((image) => (
                    <Image
                      key={image.id || image.url}
                      src={image.url}
                      alt={image.name || "Product"}
                      width={240}
                      height={240}
                    />
                  ))}
                </div>
              </>
            ) : null}
            <h2 className="section-gap">Payment</h2>
            <dl className="detail-list payment-ledger">
              <div>
                <dt>Payment method</dt>
                <dd>
                  {order.paymentMethod === "PAYMENT_ON_DELIVERY"
                    ? "Payment on delivery"
                    : "Already paid"}
                </dd>
              </div>
              <div>
                <dt>Company payment</dt>
                <dd>
                  {order.companyPaymentStatus === "PAID" ? "PAID ✓" : "PENDING"}
                </dd>
              </div>
              <div>
                <dt>Sender payment</dt>
                <dd>
                  {order.senderPaymentStatus === "PAID" ? "PAID ✓" : "PENDING"}
                </dd>
              </div>
              <div>
                <dt>Customer collection</dt>
                <dd>
                  {order.customerCollectionStatus === "COLLECTED"
                    ? "COLLECTED"
                    : "NOT COLLECTED"}
                </dd>
              </div>
            </dl>
          </section>
          <aside className="detail-card">
            <h2>Delivery information</h2>
            <dl className="detail-list">
              <div>
                <dt>Assigned rider</dt>
                <dd>{order.assignedRider?.name || "Unassigned"}</dd>
              </div>
              <div>
                <dt>Delivery code</dt>
                <dd className="delivery-code">{order.deliveryCode || "—"}</dd>
              </div>
              <div>
                <dt>Delivered</dt>
                <dd>{formatDate(order.deliveredAt)}</dd>
              </div>
              {order.confirmedBy && (
                <div>
                  <dt>Confirmed by</dt>
                  <dd>{order.confirmedBy.name}</dd>
                </div>
              )}
            </dl>
            <div className="action-stack section-gap">
              {(order.status === "PENDING" ||
                order.status === "PENDING_APPROVAL") && (
                <button
                  className="button button-primary button-full"
                  disabled={action.isPending || !canApprove}
                  title={
                    !canApprove
                      ? "Complete sender, receiver, payment, and delivery fee information first"
                      : undefined
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to approve ${order.orderId || "this order"}?`,
                      )
                    )
                      action.mutate("approve");
                  }}
                >
                  Approve order
                </button>
              )}
              {order.status === "WAITING_FOR_PACKAGE" && (
                <button
                  className="button button-primary button-full"
                  disabled={action.isPending}
                  onClick={() => action.mutate("received")}
                >
                  <PackageCheck size={17} /> Mark package received
                </button>
              )}
              {order.status === "PENDING" && (
                <>
                  <button
                    className="button button-primary button-full"
                    disabled={action.isPending}
                    onClick={() => action.mutate("out")}
                  >
                    <Truck size={17} /> Mark out for delivery
                  </button>
                  <button
                    className="button button-danger button-full"
                    disabled={action.isPending}
                    onClick={() => action.mutate("cancel")}
                  >
                    <Ban size={17} /> Cancel order
                  </button>
                </>
              )}
              <div className="field">
                <label htmlFor="assign-rider">Assign rider</label>
                <select
                  className="select"
                  id="assign-rider"
                  value={order.assignedRider?.id || order.rider?.id || ""}
                  onChange={(event) => {
                    if (event.target.value)
                      api.assignRider(orderId, event.target.value).then(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["order", orderId],
                        });
                        queryClient.invalidateQueries({ queryKey: ["orders"] });
                      });
                  }}
                >
                  <option value="">Unassigned</option>
                  {(riders.data || []).map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name}
                    </option>
                  ))}
                </select>
              </div>
              {order.status === "OUT_FOR_DELIVERY" && (
                <button
                  className="button button-danger button-full"
                  disabled={action.isPending}
                  onClick={() => action.mutate("cancel")}
                >
                  <Ban size={17} /> Cancel order
                </button>
              )}
              <WhatsAppButton
                phone={order.customerPhone}
                customerName={order.customerName}
                orderId={order.orderId || order.id}
                deliveryCode={order.deliveryCode}
              />
            </div>
            {!canApprove &&
              (order.status === "PENDING" ||
                order.status === "PENDING_APPROVAL") && (
                <p className="form-error">
                  Complete the required order and delivery fee information
                  before approval.
                </p>
              )}
            {action.isError && (
              <p className="form-error">
                That action could not be completed. Please try again.
              </p>
            )}
          </aside>
        </div>
        {order.events?.length ? (
          <section className="detail-card section-gap">
            <h2>Order timeline</h2>
            <div className="order-timeline">
              {order.events.map((event) => (
                <div className="timeline-row" key={event.id}>
                  <span className="timeline-marker" />
                  <div>
                    <strong>{event.type}</strong>
                    <small>
                      {formatDate(event.createdAt)}
                      {event.createdBy ? ` · ${event.createdBy.name}` : ""}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

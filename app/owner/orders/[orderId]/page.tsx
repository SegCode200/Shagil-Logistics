"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Truck,
  Ban,
  PackageCheck,
  Pencil,
  Save,
  LoaderCircle,
  Send,
} from "lucide-react";
import { use, useState } from "react";
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
  const zoneName = zones.data?.find(
    (z) => z.id === query.data?.deliveryZoneId,
  )?.name;
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const action = useMutation({
    mutationFn: (type: "approve" | "received" | "out" | "cancel") => {
      if (type === "cancel") return api.cancelOrder(orderId);
      if (type === "out") return api.markOutForDelivery(orderId);
      if (type === "received") return api.markPackageReceived(orderId);
      return api.approveOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  const update = useMutation({
    mutationFn: () => {
      const originalValues: Record<string, string> = {
        senderName: query.data?.senderName || "",
        senderPhoneNumber: query.data?.senderPhoneNumber || "",
        receiverName: query.data?.receiverName || "",
        receiverPhoneNumber: query.data?.receiverPhoneNumber || "",
        pickupAddress: query.data?.pickupAddress || "",
        deliveryAddress: query.data?.deliveryAddress || "",
        packageNotes: query.data?.packageNotes || "",
        quantity: String(query.data?.quantity || ""),
        pickupMethod: query.data?.pickupMethod || "SENDER_DROPOFF",
        paymentMethod: query.data?.paymentMethod || "PAYMENT_ON_DELIVERY",
        orderDetails: query.data?.orderDetails || "",
        orderAmount: String(query.data?.orderAmount ?? query.data?.amount ?? ""),
        deliveryFee: String(query.data?.deliveryFee ?? ""),
        deliveryZoneId: query.data?.deliveryZoneId || "",
      };
      const numericFields = new Set(["quantity", "orderAmount", "deliveryFee"]);
      const payload: Record<string, unknown> = {};

      Object.entries(editValues).forEach(([key, value]) => {
        if (value === originalValues[key]) return;
        payload[key] = numericFields.has(key)
          ? value
            ? Number(value)
            : undefined
          : value;
      });

      return api.updateOrder(orderId, payload);
    },
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  const assignRider = useMutation({
    mutationFn: (riderId: string) => api.assignRider(orderId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  const resendSenderAccess = useMutation({
    mutationFn: () => api.resendSenderAccessToken(orderId),
  });
  const resendReceiverAccess = useMutation({
    mutationFn: () => api.resendReceiverAccessToken(orderId),
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
  const hasAssignedRider = Boolean(order.assignedRider?.id || order.rider?.id);
  const isApproved = Boolean(
    order.approvedAt ||
      [
        "APPROVED",
        "WAITING_FOR_PACKAGE",
        "PACKAGE_RECEIVED",
        "ASSIGNED",
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ].includes(order.status),
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
          <div className="inline-actions">
            <OrderStatusBadge status={order.status} />
            <button
              className="button button-secondary"
              onClick={() => {
                setEditValues({
                  senderName: order.senderName || "",
                  senderPhoneNumber: order.senderPhoneNumber || "",
                  receiverName: order.receiverName || "",
                  receiverPhoneNumber: order.receiverPhoneNumber || "",
                  pickupAddress: order.pickupAddress || "",
                  deliveryAddress: order.deliveryAddress || "",
                  packageNotes: order.packageNotes || "",
                  quantity: String(order.quantity || ""),
                  pickupMethod: order.pickupMethod || "SENDER_DROPOFF",
                  paymentMethod: order.paymentMethod || "PAYMENT_ON_DELIVERY",
                  orderDetails: order.orderDetails || "",
                  orderAmount: String(order.orderAmount ?? order.amount ?? ""),
                  deliveryFee: String(order.deliveryFee ?? ""),
                  deliveryZoneId: order.deliveryZoneId || "",
                });
                setEditing(true);
              }}
            >
              <Pencil size={16} /> Edit order
            </button>
          </div>
        </header>
        {editing && (
          <section className="panel edit-order-panel">
            <form
              className="panel-body form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                update.mutate();
              }}
            >
              <h2 className="field-span form-section-title">Edit order</h2>
              <EditField
                label="Sender name"
                name="senderName"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Sender phone"
                name="senderPhoneNumber"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Receiver name"
                name="receiverName"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Receiver phone"
                name="receiverPhoneNumber"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Delivery address"
                name="deliveryAddress"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Pickup address"
                name="pickupAddress"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Product details"
                name="orderDetails"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Package notes"
                name="packageNotes"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Quantity"
                name="quantity"
                type="number"
                values={editValues}
                setValues={setEditValues}
              />
              <EditField
                label="Order amount"
                name="orderAmount"
                type="number"
                values={editValues}
                setValues={setEditValues}
              />
              <div className="field">
                <label htmlFor="edit-pickup">Pickup method</label>
                <select
                  className="select"
                  id="edit-pickup"
                  value={editValues.pickupMethod || ""}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      pickupMethod: event.target.value,
                    })
                  }
                >
                  <option value="SENDER_DROPOFF">Sender drop-off</option>
                  <option value="RIDER_PICKUP">Rider pickup</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-payment">Payment method</label>
                <select
                  className="select"
                  id="edit-payment"
                  value={editValues.paymentMethod || ""}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      paymentMethod: event.target.value,
                    })
                  }
                >
                  <option value="ALREADY_PAID">Already paid</option>
                  <option value="PAYMENT_ON_DELIVERY">
                    Payment on delivery
                  </option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-area">Area</label>
                <select
                  className="select"
                  id="edit-area"
                  value={editValues.deliveryZoneId || ""}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      deliveryZoneId: event.target.value,
                    })
                  }
                >
                  <option value="">Select area</option>
                  {(zones.data || [])
                    .filter((zone) => zone.active)
                    .map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} · ₦{Number(zone.fee).toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>
              <EditField
                label="Change delivery fee"
                name="deliveryFee"
                type="number"
                values={editValues}
                setValues={setEditValues}
              />
              <div className="form-actions field-span">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  disabled={update.isPending}
                >
                  <Save size={16} />{" "}
                  {update.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
              {update.isError && (
                <p className="form-error field-span">
                  Unable to update this order. Please check the details and try
                  again.
                </p>
              )}
            </form>
          </section>
        )}
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
                <dd>{order.senderName}</dd>
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
                    ? `₦${Number(amount.toFixed(2)).toLocaleString()}`
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
                  {order.totalAmountToCollect == null
                    ? "—"
                    : `₦${Number(order.totalAmountToCollect).toLocaleString()}`}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(order.createdAt)}</dd>
              </div>
            </dl>
            {order.images?.some((image) => image.publicUrl || image.url) ? (
              <>
                <h2 className="section-gap">Product images</h2>
                <div className="public-image-grid">
                  {order.images.map((image) => {
                    const imageUrl = image.publicUrl || image.url;
                    if (!imageUrl) return null;
                    return (
                      <a
                        className="product-image-link"
                        href={imageUrl}
                        key={image.id || imageUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Image
                          className="product-image"
                          src={imageUrl}
                          alt={
                            image.originalFilename || image.name || "Product"
                          }
                          width={720}
                          height={540}
                        />
                      </a>
                    );
                  })}
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
                  {order.receiverCollectionStatus === "COLLECTED"
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
                <dd>
                  {order.assignedRider?.name || "Unassigned"} -{" "}
                  {order.assignedRider?.phone || "—"}
                </dd>
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
              {isApproved && (
                <div className="access-token-actions">
                  <p className="action-label">Public access links</p>
                  <button
                    className="button button-secondary button-full"
                    disabled={resendSenderAccess.isPending}
                    onClick={() => resendSenderAccess.mutate()}
                  >
                    <Send size={16} />
                    {resendSenderAccess.isPending
                      ? "Sending sender link..."
                      : "Resend sender access"}
                  </button>
                  {resendSenderAccess.isSuccess && (
                    <p className="success-text" role="status">
                      Sender access link sent.
                    </p>
                  )}
                  {resendSenderAccess.isError && (
                    <p className="form-error" role="alert">
                      {resendSenderAccess.error instanceof Error
                        ? resendSenderAccess.error.message
                        : "Could not resend the sender access link."}
                    </p>
                  )}
                  <button
                    className="button button-secondary button-full"
                    disabled={resendReceiverAccess.isPending}
                    onClick={() => resendReceiverAccess.mutate()}
                  >
                    <Send size={16} />
                    {resendReceiverAccess.isPending
                      ? "Sending receiver link..."
                      : "Resend receiver access"}
                  </button>
                  {resendReceiverAccess.isSuccess && (
                    <p className="success-text" role="status">
                      Receiver access link sent.
                    </p>
                  )}
                  {resendReceiverAccess.isError && (
                    <p className="form-error" role="alert">
                      {resendReceiverAccess.error instanceof Error
                        ? resendReceiverAccess.error.message
                        : "Could not resend the receiver access link."}
                    </p>
                  )}
                </div>
              )}
              {order.status === "PENDING_APPROVAL" && (
                <button
                  className="button button-primary button-full"
                  disabled={action.isPending || !canApprove || !hasAssignedRider}
                  title={
                    !canApprove
                      ? "Complete sender, receiver, payment, and delivery fee information first"
                      : !hasAssignedRider
                        ? "Assign a rider before approval"
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
                  disabled={assignRider.isPending}
                  value={
                    assignRider.isPending
                      ? assignRider.variables
                      : order.assignedRider?.id || order.rider?.id || ""
                  }
                  onChange={(event) => {
                    if (event.target.value)
                      assignRider.mutate(event.target.value);
                  }}
                >
                  <option value="">Unassigned</option>
                  {(riders.data || []).map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name} - ({rider.phone || "No phone"})
                    </option>
                  ))}
                </select>
                {assignRider.isPending && (
                  <p className="assignment-status" role="status">
                    <LoaderCircle size={14} className="spin" /> Assigning rider...
                  </p>
                )}
                {assignRider.isError && (
                  <p className="form-error" role="alert">
                    Rider assignment failed. Please try again.
                  </p>
                )}
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
            </div>
            {!canApprove &&
              order.status === "PENDING_APPROVAL" && (
                <p className="form-error">
                  Complete the required order and delivery fee information
                  before approval.
                </p>
              )}
            {order.status === "PENDING_APPROVAL" && !hasAssignedRider && (
              <p className="form-error">Assign a rider before approval.</p>
            )}
            {action.isError && (
              <p className="form-error">
                {action.error instanceof Error
                  ? action.error.message
                  : "That action could not be completed. Please try again."}
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

function EditField({
  label,
  name,
  values,
  setValues,
  type = "text",
}: {
  label: string;
  name: string;
  values: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
  type?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={`edit-${name}`}>{label}</label>
      <input
        className="input"
        id={`edit-${name}`}
        type={type}
        value={values[name] || ""}
        onChange={(event) =>
          setValues({ ...values, [name]: event.target.value })
        }
      />
    </div>
  );
}

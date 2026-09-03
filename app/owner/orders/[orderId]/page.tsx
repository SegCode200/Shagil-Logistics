"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Ban,
  Pencil,
  Save,
  LoaderCircle,
  Send,
  Upload,
} from "lucide-react";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { PaymentReceiptViewer } from "@/components/orders/payment-receipt-viewer";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  formatDate,
} from "@/components/ui/primitives";

type Props = { params: Promise<{ orderId: string }> };

function calculateDeliveryFeeBreakdown(
  value: number | string | null | undefined,
  settings?: { riderCommissionRate?: number | string; vat?: number | string } | null,
) {
  const deliveryFee = Number(value ?? 0) || 0;
  if (!settings || deliveryFee <= 0) {
    return null;
  }

  const commissionRate = Number(settings.riderCommissionRate ?? 0);
  const vatRate = Number(settings.vat ?? 0);
  if (commissionRate === 0 && vatRate === 0) {
    return {
      baseFee: deliveryFee,
      riderCommissionAmount: 0,
      vatAmount: 0,
      formula: "Base fee + rider commission + VAT = final fee",
    };
  }

  const baseFee = deliveryFee / ((1 + commissionRate / 100) * (1 + vatRate / 100));
  const riderCommissionAmount = baseFee * (commissionRate / 100);
  const vatAmount = deliveryFee - baseFee - riderCommissionAmount;

  return {
    baseFee,
    riderCommissionAmount,
    vatAmount,
    formula:
      "Base fee = fixed delivery + (distance × variable rate) → rider commission → VAT → final delivery fee",
  };
}

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
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
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
  const [replacementRiderId, setReplacementRiderId] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const action = useMutation({
    mutationFn: (type: "approve" | "cancel") => {
      if (type === "cancel") return api.cancelOrder(orderId);
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
        pickupMethod: query.data?.pickupMethod || "SENDER_DROPOFF",
        paymentMethod: query.data?.paymentMethod || "PAYMENT_ON_DELIVERY",
        deliveryFee: String(query.data?.deliveryFee ?? ""),
        deliveryZoneId: query.data?.deliveryZoneId || "",
      };
      const numericFields = new Set(["quantity", "deliveryFee"]);
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
  const reassignRider = useMutation({
    mutationFn: (riderId: string) => api.reassignRider(orderId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  const confirmFinalPayment = useMutation({
    mutationFn: () => api.confirmFinalPayment(orderId),
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
  const uploadPaymentReceipt = useMutation({
    mutationFn: () => {
      if (!paymentReceipt) throw new Error("Select a receipt first.");
      return api.uploadAlreadyPaidReceipts(orderId, paymentReceipt);
    },
    onSuccess: () => {
      setPaymentReceipt(null);
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
  const deliveryBreakdown = calculateDeliveryFeeBreakdown(
    order.deliveryFee,
    settings.data,
  );
  const editableBaseFee = Number(deliveryBreakdown?.baseFee ?? order.deliveryFee ?? 0);
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
        "ASSIGNED",
        "PICKED_UP",
        "DELIVERED",
      ].includes(order.status),
  );
  const isFinalPaymentReady =
    order.status === "DELIVERED" &&
    order.companyPaymentStatus === "PAID" &&
    order.senderPaymentStatus === "PAID" &&
    order.finalPaymentStatus !== "PAID";
  const getRiderOptionLabel = (rider: { name?: string; bikeId?: string | null; companyBikeId?: string | null; phone?: string | null }) => {
    const bikeNumber = rider.companyBikeId || rider.bikeId;
    return bikeNumber ? `${rider.name || "Rider"} - Bike ${bikeNumber}` : rider.name || "Rider";
  };
  return (
    <AppShell role="OWNER">
      {paymentError && (
        <div className="validation-dialog-backdrop">
          <section
            className="validation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="owner-payment-confirmation-error"
          >
            <p className="eyebrow">Payment confirmation required</p>
            <h2 id="owner-payment-confirmation-error">Confirm payment first</h2>
            <p>
              Please tick the checkbox and confirm that the customer has paid
              before approving this order.
            </p>
            <button
              type="button"
              className="button button-primary button-full"
              onClick={() => setPaymentError(false)}
            >
              Continue
            </button>
          </section>
        </div>
      )}
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
                  pickupMethod: order.pickupMethod || "SENDER_DROPOFF",
                  paymentMethod: order.paymentMethod || "PAYMENT_ON_DELIVERY",
                  deliveryFee: String(editableBaseFee),
                  deliveryZoneId: order.deliveryZoneId || "",
                });
                setEditing(true);
              }}
            >
              <Pencil size={16} /> Edit order
            </button>
          </div>
        </header>
        {order.paymentReceipts?.length ? (
          <section className="payment-receipts-section payment-receipts-top">
            <h2>Uploaded payment receipts ({order.paymentReceipts.length})</h2>
            <PaymentReceiptViewer receipts={order.paymentReceipts} />
          </section>
        ) : null}
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
                label="Base fee"
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
              {deliveryBreakdown && (
                <div className="fee-breakdown-wrap">
                  <dt>Fee breakdown</dt>
                  <dd>
                    <div className="fee-breakdown">
                      <div>
                        <span>Base fee</span>
                        <strong>
                          ₦{Number(deliveryBreakdown.baseFee).toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span>Rider commission</span>
                        <strong>
                          ₦{Number(deliveryBreakdown.riderCommissionAmount).toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span>VAT</span>
                        <strong>
                          ₦{Number(deliveryBreakdown.vatAmount).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                    <small className="fee-formula-note">
                      {deliveryBreakdown.formula}
                    </small>
                  </dd>
                </div>
              )}
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
                    : "Payment before delivery"}
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
            {order.paymentMethod === "ALREADY_PAID" && order?.status !== "APPROVED" && (
              <label className="payment-confirmation">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(event) => setPaymentConfirmed(event.target.checked)}
                />
                <span>You must fill checkbox to confirm customer payment.</span>
              </label>
            )}
            {order.paymentMethod === "ALREADY_PAID" && order.status === "PENDING_APPROVAL" && !order.paymentReceipts?.length && (
              <div className="payment-receipt-upload">
                <p className="action-label">Attach sender payment receipt</p>
                <label className="receipt-upload-label" htmlFor="owner-payment-receipt">Choose payment receipt</label>
                <input
                  id="owner-payment-receipt"
                  className="receipt-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)}
                />
                <span className="receipt-file-name">{paymentReceipt ? paymentReceipt.name : "No receipt selected"}</span>
                <button
                  type="button"
                  className="button button-secondary button-full"
                  disabled={!paymentReceipt || uploadPaymentReceipt.isPending}
                  onClick={() => uploadPaymentReceipt.mutate()}
                >
                  <Upload size={16} />
                  {uploadPaymentReceipt.isPending ? "Uploading receipt..." : "Upload payment receipt"}
                </button>
                {uploadPaymentReceipt.isSuccess && <p className="success-text">Payment receipt uploaded.</p>}
                {uploadPaymentReceipt.isError && <p className="form-error">{uploadPaymentReceipt.error instanceof Error ? uploadPaymentReceipt.error.message : "Could not upload the payment receipt."}</p>}
              </div>
            )}
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
                      order.paymentMethod === "ALREADY_PAID" &&
                      !paymentConfirmed
                    ) {
                      setPaymentError(true);
                      return;
                    }
                    const confirmedMessage =
                      order.paymentMethod === "ALREADY_PAID"
                        ? `Are you sure you have confirmed that the customer has paid for ${order.orderId || "this order"}?`
                        : `Are you sure you want to approve ${order.orderId || "this order"}?`;
                    if (window.confirm(confirmedMessage)) {
                      action.mutate("approve");
                    }
                  }}
                >
                  {action.isPending ? "Approving..." : "Approve order"}
                </button>
              )}
              {order.status === "PENDING" && (
                <>
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
                <label htmlFor="assign-rider">
                  {hasAssignedRider ? "Reassign rider" : "Assign rider"}
                </label>
                <select
                  className="select"
                  id="assign-rider"
                  disabled={assignRider.isPending || reassignRider.isPending}
                  value={replacementRiderId || order.assignedRider?.id || order.rider?.id || ""}
                  onChange={(event) => {
                    if (!hasAssignedRider && event.target.value)
                      assignRider.mutate(event.target.value);
                    else setReplacementRiderId(event.target.value);
                  }}
                >
                  <option value="">Unassigned</option>
                  {(riders.data || []).map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {getRiderOptionLabel(rider)}
                    </option>
                  ))}
                </select>
                {hasAssignedRider && (
                  <button
                    type="button"
                    className="button button-secondary button-full"
                    disabled={reassignRider.isPending || !replacementRiderId || replacementRiderId === (order.assignedRider?.id || order.rider?.id)}
                    onClick={() => reassignRider.mutate(replacementRiderId)}
                  >
                    {reassignRider.isPending ? "Reassigning rider..." : "Reassign rider"}
                  </button>
                )}
                {assignRider.isPending && (
                  <p className="assignment-status" role="status">
                    <LoaderCircle size={14} className="spin" /> {hasAssignedRider ? "Reassigning rider..." : "Assigning rider..."}
                  </p>
                )}
                {(assignRider.isError || reassignRider.isError) && (
                  <p className="form-error" role="alert">
                    Rider assignment failed. Please try again.
                  </p>
                )}
              </div>
              {(order.finalPaymentStatus !== "PAID" && order?.paymentMethod === "PAYMENT_ON_DELIVERY")   &&  (
                <button
                  className="button button-success button-full"
                  disabled={
                    confirmFinalPayment.isPending ||
                    !isFinalPaymentReady
                  }
                  title={
                    !isFinalPaymentReady
                      ? "Final payment can be confirmed only when all payments are settled and the order is delivered."
                      : undefined
                  }
                  onClick={() => {
                    if (!isFinalPaymentReady) {
                      return;
                    }
                    if (
                      window.confirm(
                        `Are you sure you want to confirm the final payment for ${order.orderId || "this order"}? This action cannot be undone.`,
                      )
                    ) {
                      confirmFinalPayment.mutate();
                    }
                  }}
                >
                  {confirmFinalPayment.isPending
                    ? "Confirming final payment..."
                    : "POD payment confirmation"}
                </button>
              )}
              {!isFinalPaymentReady && order.finalPaymentStatus !== "PAID" && order?.paymentMethod === "PAYMENT_ON_DELIVERY" && (
                <p className="form-error">
                  Final payment cannot be confirmed until all payments are made and the order is delivered.
                </p>
              )}
              {confirmFinalPayment.isError && (
                <p className="form-error">Final payment could not be confirmed.</p>
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

"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Pencil, Save } from "lucide-react";
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
type EditValues = Record<string, string>;

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
    };
  }

  const multiplier = (1 + commissionRate / 100) * (1 + vatRate / 100);
  const baseFee = deliveryFee / multiplier;
  const riderCommissionAmount = baseFee * (commissionRate / 100);
  const vatAmount = deliveryFee - baseFee - riderCommissionAmount;

  return {
    baseFee,
    riderCommissionAmount,
    vatAmount,
  };
}

export default function ManagerOrderDetailsPage({ params }: Props) {
  const { orderId } = use(params);
  const { user, isLoading } = useRoleRedirect("STATION_MANAGER");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [replacementRiderId, setReplacementRiderId] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [notice, setNotice] = useState("");
  const [editValues, setEditValues] = useState<EditValues>({});
  const order = useQuery({
    queryKey: ["managerOrder", orderId],
    queryFn: () => api.getManagerOrder(orderId),
    enabled: Boolean(user),
  });
  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: api.getStationRiders,
    enabled: Boolean(user),
  });
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
    enabled: Boolean(user),
  });
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
    enabled: Boolean(user),
  });
  const update = useMutation({
    mutationFn: () => api.updateManagerOrder(orderId, editValues),
    onSuccess: () => {
      setEditing(false);
      setNotice("Order updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  const approve = useMutation({
    mutationFn: () => api.approveManagerOrder(orderId),
    onSuccess: () => {
      setNotice("Order approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  const assignRider = useMutation({
    mutationFn: (riderId: string) =>
      api.updateManagerOrder(orderId, { assignedRiderId: riderId }),
    onSuccess: () => {
      setNotice("Rider assigned successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  const reassignRider = useMutation({
    mutationFn: (riderId: string) => api.reassignRider(orderId, riderId),
    onSuccess: () => {
      setNotice("Rider reassigned successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  const confirmReceiverPayment = useMutation({
    mutationFn: () => api.confirmReceiverPaymentForUser(orderId),
    onSuccess: () => {
      setNotice("Receiver payment confirmed successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  if (isLoading || !user) return <LoadingState />;
  if (order.isLoading)
    return (
      <AppShell role="STATION_MANAGER">
        <LoadingState label="Loading order" />
      </AppShell>
    );
  if (order.isError || !order.data)
    return (
      <AppShell role="STATION_MANAGER">
        <div className="page">
          <ErrorState message="This order is unavailable." />
        </div>
      </AppShell>
    );
  const data = order.data;
  const deliveryBreakdown = calculateDeliveryFeeBreakdown(
    data.deliveryFee,
    settings.data,
  );
  function beginEditing() {
    setEditValues({
      senderName: data.senderName || "",
      senderPhoneNumber: data.senderPhoneNumber || "",
      receiverName: data.receiverName || "",
      receiverPhoneNumber: data.receiverPhoneNumber || "",
      pickupAddress: data.pickupAddress || "",
      deliveryAddress: data.deliveryAddress || "",
      stationId: data.stationId || data.station?.id || "",
      deliveryZoneId: data.deliveryZoneId || data.deliveryZone?.id || "",
      pickupMethod: data.pickupMethod || "SENDER_DROPOFF",
      paymentMethod: data.paymentMethod || "PAYMENT_ON_DELIVERY",
      deliveryFee: String(data.deliveryFee ?? ""),
    });
    setEditing(true);
  }
  const field = (label: string, name: string, type = "text") => (
    <div className="field">
      <label htmlFor={`manager-edit-${name}`}>{label}</label>
      <input
        className="input"
        id={`manager-edit-${name}`}
        type={type}
        value={editValues[name] || ""}
        onChange={(event) =>
          setEditValues({ ...editValues, [name]: event.target.value })
        }
      />
    </div>
  );
  return (
    <AppShell role="STATION_MANAGER">
      {paymentError && (
        <div className="validation-dialog-backdrop">
          <section
            className="validation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-confirmation-error"
          >
            <p className="eyebrow">Payment confirmation required</p>
            <h2 id="payment-confirmation-error">Confirm payment first</h2>
            <p>Tick the payment received checkbox before approving this order.</p>
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
        <Link className="back-link" href="/manager/orders">
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <header className="page-header detail-header">
          <div>
            <p className="eyebrow">Order details</p>
            <h1>{data.orderId || data.id}</h1>
            <p className="subtext">Created {formatDate(data.createdAt)}</p>
          </div>

          <div className="inline-actions">
            <OrderStatusBadge status={data.status} />
            {data.status === "PENDING_APPROVAL" && (
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={beginEditing}
                >
                  <Pencil size={16} /> Edit order
                </button>
                <button
                  className="button button-danger"
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to cancel this order?")
                    ) {
                      api.cancelOrder(orderId).then(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["managerOrders"],
                        });
                        window.location.href = "/manager/orders";
                      });
                    }
                  }}
                >
                  <Check size={16} />
                  Cancel order
                </button>
              </div>
            )}
          </div>
        </header>
        {notice && (
          <p className="success-text">
            <Check size={16} /> {notice}
          </p>
        )}
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
              {field("Sender name", "senderName")}
              {field("Sender phone", "senderPhoneNumber", "tel")}
              {field("Receiver name", "receiverName")}
              {field("Receiver phone", "receiverPhoneNumber", "tel")}
              {field("Delivery address", "deliveryAddress")}
              {field("Pickup address", "pickupAddress")}
              <div className="field">
                <label htmlFor="manager-edit-station">Station</label>
                <select
                  className="select"
                  id="manager-edit-station"
                  value={editValues.stationId || ""}
                  onChange={(event) =>
                    setEditValues({
                      ...editValues,
                      stationId: event.target.value,
                    })
                  }
                >
                  <option value="">Select station</option>
                  {(data.station ? [data.station] : []).map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="manager-edit-zone">Area</label>
                <select
                  className="select"
                  id="manager-edit-zone"
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
                        {zone.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="manager-edit-payment">Payment method</label>
                <select
                  className="select"
                  id="manager-edit-payment"
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
              {field("Delivery fee", "deliveryFee", "number")}
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
                  Unable to update this order. Please try again.
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
                <dt>Receiver Name</dt>
                <dd>{data.receiverName || data.customerName}</dd>
              </div>
              <div>
                <dt>Phone Number</dt>
                <dd>{data.receiverPhoneNumber || "-"}</dd>
              </div>
              <div>
                <dt>Delivery address</dt>
                <dd>{data.deliveryAddress}</dd>
              </div>
            </dl>
            <h2 className="section-gap">Order information</h2>
            <dl className="detail-list">
              <div>
                <dt>Sender Name/ Business</dt>
                <dd>{data.senderName || "-"}</dd>
              </div>
              <div>
                <dt>Sender phone number</dt>
                <dd>{data.senderPhoneNumber || "-"}</dd>
              </div>
              <div>
                <dt>Sender Pickup address</dt>
                <dd>{data.pickupAddress || "-"}</dd>
              </div>
              <div>
                <dt>Delivery zone</dt>
                <dd>{data.deliveryZone?.name || "-"}</dd>
              </div>
              <div>
                <dt>Delivery fee</dt>
                <dd>
                  {data.deliveryFee == null
                    ? "-"
                    : `₦${Number(data.deliveryFee).toLocaleString()}`}
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
                  </dd>
                </div>
              )}
              <div>
                <dt>Sender Payment Status</dt>
                <dd>{data.paymentStatus || data.senderPaymentStatus || "-"}</dd>
              </div>
              <div>
                <dt>Receiver Payment Status</dt>
                <dd>{data.companyPaymentStatus || "-"}</dd>
              </div>
            </dl>
            {data.images?.length ? (
              <>
                <h2 className="section-gap">Product images</h2>
                <div className="public-image-grid">
                  {data.images.map((image) => {
                    const imageUrl = image.publicUrl || image.url;
                    return imageUrl ? (
                      <Image
                        className="product-image"
                        key={image.id || imageUrl}
                        src={imageUrl}
                        alt={image.originalFilename || image.name || "Product"}
                        width={720}
                        height={540}
                      />
                    ) : null;
                  })}
                </div>
              </>
            ) : null}
          </section>
          <aside className="detail-card">
            <h2>Operations</h2>
            <dl className="detail-list">
              <div>
                <dt>Station</dt>
                <dd>{data.station?.name || "-"}</dd>
              </div>
              <div>
                <dt>Rider</dt>
                <dd>
                  {data.assignedRider?.name || data.rider?.name || "Unassigned"}
                </dd>
              </div>
            </dl>
            {data.paymentMethod === "ALREADY_PAID" && (
              <label className="payment-confirmation">
                <input
                  type="checkbox"
                  checked={paymentConfirmed || data.senderPaymentStatus === "PAID"}
                  disabled={data.senderPaymentStatus === "PAID"}
                  onChange={(event) => setPaymentConfirmed(event.target.checked)}
                />
                <span>You must fill checkbox to confirm customer payment.</span>
              </label>
            )}
            <div className="action-stack section-gap">
              {data.status === "PENDING_APPROVAL" && (
                <button
                  className="button button-primary button-full"
                  disabled={approve.isPending}
                  onClick={() => {
                    if (
                      data.paymentMethod === "ALREADY_PAID" &&
                      data.senderPaymentStatus !== "PAID" &&
                      !paymentConfirmed
                    ) {
                      setPaymentError(true);
                      return;
                    }
                    approve.mutate();
                  }}
                >
                  {approve.isPending ? "Approving..." : "Approve order"}
                </button>
              )}

              <div className="field">
                <label htmlFor="manager-rider">
                  {data.assignedRider?.id || data.rider?.id
                    ? "Reassign rider"
                    : "Assign rider"}
                </label>
                <select
                  className="select"
                  id="manager-rider"
                  disabled={
                    riders.isLoading ||
                    assignRider.isPending ||
                    reassignRider.isPending
                  }
                  value={replacementRiderId || data.assignedRider?.id || data.rider?.id || ""}
                  onChange={(event) => {
                    if (data.assignedRider?.id || data.rider?.id)
                      setReplacementRiderId(event.target.value);
                    else if (event.target.value) assignRider.mutate(event.target.value);
                  }}
                >
                  <option value="">Unassigned</option>
                  {(riders.data || []).map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name}
                    </option>
                  ))}
                </select>
                {(data.assignedRider?.id || data.rider?.id) && (
                  <button
                    type="button"
                    className="button button-secondary button-full"
                    disabled={reassignRider.isPending || !replacementRiderId || replacementRiderId === (data.assignedRider?.id || data.rider?.id)}
                    onClick={() => reassignRider.mutate(replacementRiderId)}
                  >
                    {reassignRider.isPending ? "Reassigning rider..." : "Reassign rider"}
                  </button>
                )}
              </div>
              {data.status === "PICKED_UP" &&
                data.paymentMethod === "PAYMENT_ON_DELIVERY" &&
                data.receiverCollectionStatus !== "COLLECTED" && (
                  <button
                    className="button button-success button-full"
                    disabled={confirmReceiverPayment.isPending}
                    onClick={() => confirmReceiverPayment.mutate()}
                  >
                    {confirmReceiverPayment.isPending
                      ? "Confirming payment..."
                      : "Confirm receiver payment"}
                  </button>
                )}
              {(approve.isError || assignRider.isError || reassignRider.isError || confirmReceiverPayment.isError) && (
                <p className="form-error">
                  The order action could not be completed.
                </p>
              )}
            </div>
          </aside>
        </div>
        <section className="detail-card section-gap">
          <h2>Order history</h2>
          {data.events?.length ? (
            <div className="stack-list">
              {data.events.map((event) => (
                <div className="detail-card" key={event.id}>
                  <strong>{event.type}</strong>
                  <span>
                    {formatDate(event.createdAt)}
                    {event.createdBy ? ` · ${event.createdBy.name}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No operational history available.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

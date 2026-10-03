"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { RiderOrderImages } from "@/components/orders/rider-order-images";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { PaymentReceiptViewer } from "@/components/orders/payment-receipt-viewer";
import { ErrorState, LoadingState } from "@/components/ui/primitives";

type Props = { params: Promise<{ orderId: string }> };
export default function ConfirmDeliveryPage({ params }: Props) {
  const { orderId: routeOrderId } = use(params);
  const { user, isLoading } = useRoleRedirect("RIDER");
  const queryClient = useQueryClient();
  const [lookupCode, setLookupCode] = useState("");
  const [validatedOrder, setValidatedOrder] = useState<Awaited<
    ReturnType<typeof api.lookupAssignedOrderByDeliveryCode>
  > | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<null | {
    type: "success" | "error";
    title: string;
    message: string;
  }>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Awaited<
    ReturnType<typeof api.confirmDelivery>
  > | null>(null);
  const deliveries = useQuery({
    queryKey: ["rider-orders"],
    queryFn: () => api.getRiderOrders(1, 100),
    enabled: Boolean(user && routeOrderId),
  });
  const order = deliveries.data?.items.find(
    (delivery) =>
      delivery.id === routeOrderId || delivery.orderId === routeOrderId,
  );
  const currentOrder = validatedOrder ?? order;
  const orderIdForAction = currentOrder?.id ?? routeOrderId;
  const deliveryCodeForAction = validatedOrder?.deliveryCode ?? lookupCode.trim();
  const lookupOrderMutation = useMutation({
    mutationFn: () =>
      api.lookupAssignedOrderByDeliveryCode({
        deliveryCode: lookupCode.trim(),
      }),
    onSuccess: (data) => {
      setValidatedOrder(data);
      setLookupError(null);
    },
    onError: (error) => {
      setLookupError(
        error instanceof Error && error.message !== "REQUEST_FAILED"
          ? error.message
          : "This delivery code was not found for your assigned orders.",
      );
    },
  });
  const mutation = useMutation({
    mutationFn: () =>
      api.confirmDelivery({
        orderId: orderIdForAction,
        deliveryCode: deliveryCodeForAction,
      }),
    onSuccess: (data) => {
      setConfirmedOrder(data);
      setConfirmed(true);
    },
  });
  const uploadPaymentReceipt = useMutation({
    mutationFn: (receiptFile: File) =>
      api.uploadPaymentOnDeliveryReceipts(orderIdForAction, receiptFile),
    onSuccess: () => {
      setPaymentReceipt(null);
      setPaymentDialog({
        type: "success",
        title: "Payment receipt uploaded",
        message: "The payment receipt was uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
    onError: (uploadError) => {
      setPaymentDialog({
        type: "error",
        title: "Receipt upload failed",
        message:
          uploadError instanceof Error && uploadError.message !== "REQUEST_FAILED"
            ? uploadError.message
            : "Could not upload the payment receipt. Please try again.",
      });
    },
  });
  const receiverPaymentMutation = useMutation({
    mutationFn: () => api.confirmReceiverPaymentForUser(orderIdForAction),
    onSuccess: () => {
      setPaymentDialog({
        type: "success",
        title: "Release payment for sender",
        message: "Receiver payment has been confirmed and the sender can now be released.",
      });
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
    onError: () => {
      setPaymentDialog({
        type: "error",
        title: "Release payment for sender",
        message: "Could not confirm receiver payment. Please try again.",
      });
    },
  });
  const resendCodeMutation = useMutation({
    mutationFn: () => api.resendReceiverDeliveryCodeForUser(orderIdForAction),
  });
  const orderIsReadyForFinalConfirmation =
    currentOrder?.senderPaymentStatus === "PAID" &&
    currentOrder?.receiverCollectionStatus === "COLLECTED";
  if (isLoading || !user || deliveries.isLoading) return <LoadingState />;
  if (deliveries.isError && !validatedOrder)
    return (
      <AppShell role="RIDER">
        <div className="page">
          <ErrorState message="We couldn't find this delivery in your assigned orders." />
        </div>
      </AppShell>
    );
  if (!order && !validatedOrder) {
    return (
      <AppShell role="RIDER">
        <div className="page confirm-page">
          <Link href="/rider/dashboard" className="back-link">
            <ArrowLeft size={16} /> Back to deliveries
          </Link>
          <div className="confirm-box">
            <div className="confirm-kicker">
              <ShieldCheck size={18} />
              <span>Delivery lookup</span>
            </div>
            <h2>Verify delivery code</h2>
            <p className="subtext">
              Enter the delivery code to confirm the order belongs to you before continuing.
            </p>
            <form
              className="confirm-form"
              onSubmit={(event) => {
                event.preventDefault();
                lookupOrderMutation.mutate();
              }}
            >
              <div className="field">
                <label htmlFor="delivery-code-lookup">Delivery code</label>
                <input
                  className="input"
                  id="delivery-code-lookup"
                  required
                  inputMode="numeric"
                  value={lookupCode}
                  onChange={(event) => setLookupCode(event.target.value)}
                  placeholder="739284"
                />
              </div>
              {lookupError && <p className="form-error confirm-error">{lookupError}</p>}
              <button
                type="submit"
                className="button button-primary button-full"
                disabled={lookupOrderMutation.isPending || lookupCode.trim().length < 4}
              >
                {lookupOrderMutation.isPending ? "Checking code..." : "Verify delivery code"}
              </button>
            </form>
          </div>
        </div>
      </AppShell>
    );
  }
  const pickupAddressVisible = ![
    "PICKED_UP",
    "DELIVERED",
    "CANCELLED",
  ].includes(currentOrder?.status ?? "PENDING");
  if (confirmed)
    return (
      <AppShell role="RIDER">
        <div className="page confirm-page">
          <div className="success-card">
            <CheckCircle2 size={42} color="#2d9862" />
            <h2>Delivery confirmed</h2>
            <p>
              Order {confirmedOrder?.orderId || currentOrder?.orderId || routeOrderId} has
              been successfully delivered.
            </p>
            <dl className="detail-list">
              <div>
                <dt>Customer</dt>
                <dd>{currentOrder?.customerName || "—"}</dd>
              </div>
              <div>
                <dt>Delivery time</dt>
                <dd>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date())}
                </dd>
              </div>
            </dl>
            <Link
              href="/rider/dashboard"
              className="button button-primary button-full"
            >
              Back to deliveries
            </Link>
          </div>
        </div>
      </AppShell>
    );
  return (
    <AppShell role="RIDER">
      {paymentDialog && (
        <div className="validation-dialog-backdrop">
          <section
            className="validation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rider-payment-dialog-title"
          >
            <p className="eyebrow">
              {paymentDialog.type === "success" ? "Success" : "Payment update failed"}
            </p>
            <h2 id="rider-payment-dialog-title">{paymentDialog.title}</h2>
            <p>{paymentDialog.message}</p>
            <button
              type="button"
              className="button button-primary button-full"
              onClick={() => setPaymentDialog(null)}
            >
              Continue
            </button>
          </section>
        </div>
      )}
      <div className="page confirm-page">
        <Link href="/rider/dashboard" className="back-link">
          <ArrowLeft size={16} /> Back to deliveries
        </Link>
        <div className="confirm-box">
          <div className="confirm-kicker">
            <ShieldCheck size={18} />
            <span>Delivery verification</span>
          </div>
          <h2>Step-by-step delivery confirmation</h2>
          <p className="subtext">
            First verify the code, then confirm payment and finish when the sender confirms receipt.
          </p>
          {currentOrder?.paymentReceipts?.length && currentOrder?.paymentMethod === "PAYMENT_ON_DELIVERY" ? (
            <section className="payment-receipts-section payment-receipts-top">
              <h2>Uploaded payment receipts ({currentOrder.paymentReceipts.length})</h2>
              <PaymentReceiptViewer receipts={currentOrder.paymentReceipts} />
            </section>
          ) : null}
          <section className="rider-pickup-summary">
            <span className="rider-route-label">Pickup</span>
            <div className="rider-route-detail">
              <span className="rider-route-detail-label">Pickup name</span>
              <strong className="rider-route-detail-value">{currentOrder?.senderName || "Sender"}</strong>
            </div>
            {pickupAddressVisible ? (
              <div className="rider-route-detail">
                <span className="rider-route-detail-label">Pickup address</span>
                <p className="rider-route-address">
                  <MapPin size={15} />
                  <strong className="rider-route-detail-value">
                    {currentOrder?.pickupAddress || "Pickup address unavailable"}
                  </strong>
                </p>
                {currentOrder?.pickupAddress && (
                  <a
                    className="rider-map-link"
                    href={googleMapsDirectionsUrl(currentOrder.pickupAddress)}
                  >
                    <Navigation size={14} /> Open in Maps
                  </a>
                )}
              </div>
            ) : (
              <p className="rider-route-complete">Pickup complete</p>
            )}
          </section>
          <div className="delivery-summary delivery-summary-card rider-receiver-highlight">
            <span className="rider-route-label">Delivery</span>
            <div className="receiver-heading">
              <span className="receiver-avatar">
                {(currentOrder?.receiverName || currentOrder?.customerName || "R").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <span className="rider-route-detail-label">Receiver name</span>
                <strong className="rider-receiver-name">
                  {currentOrder?.receiverName || currentOrder?.customerName || "Receiver"}
                </strong>
                <span className="rider-order-id">{currentOrder?.orderId || routeOrderId}</span>
              </div>
            </div>
            <div className="rider-receiver-phone">
              <strong>Receiver phone</strong>
              {currentOrder?.receiverPhoneNumber || currentOrder?.receiverPhone ? (
                <a
                  className="rider-phone-link"
                  href={`tel:${currentOrder?.receiverPhoneNumber || currentOrder?.receiverPhone}`}
                >
                  <Phone size={14} /> {currentOrder?.receiverPhoneNumber || currentOrder?.receiverPhone}
                </a>
              ) : (
                <span>Not provided</span>
              )}
            </div>
            <div className="rider-route-detail">
              <span className="rider-route-detail-label">Receiver address</span>
              <p className="delivery-address rider-route-address">
                <MapPin size={15} />
                <strong className="rider-route-detail-value">{currentOrder?.deliveryAddress || "Delivery address unavailable"}</strong>
              </p>
              {currentOrder?.deliveryAddress && (
                <a
                  className="rider-map-link"
                  href={googleMapsDirectionsUrl(
                    [currentOrder.deliveryAddress, currentOrder.deliveryZone?.name]
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
                {currentOrder?.deliveryZone?.name || "Not provided"}
              </strong>
            </div>
            <span className="collection-line">
              {currentOrder?.paymentMethod === "PAYMENT_ON_DELIVERY"
                ? `${currentOrder?.paymentCoverage === "ITEM_AND_DELIVERY" ? "Item and delivery amount to collect" : "Delivery fee to collect"}: ₦${Number(currentOrder?.paymentCoverage === "ITEM_AND_DELIVERY" ? currentOrder?.totalAmountToCollect ?? currentOrder?.deliveryFee ?? 0 : currentOrder?.deliveryFee ?? 0).toLocaleString()}`
                : "Already paid"}
            </span>
            {currentOrder?.paymentMethod === "PAYMENT_ON_DELIVERY" && currentOrder?.paymentCoverage && (
              <span className="collection-line">
                Receiver pays: {currentOrder?.paymentCoverage === "ITEM_AND_DELIVERY" ? "Item and delivery fee" : "Delivery fee only"}
              </span>
            )}
          </div>
          <RiderOrderImages images={currentOrder?.images ?? []} />
          {currentOrder?.paymentMethod === "PAYMENT_ON_DELIVERY" && (
            <div className="payment-receipt-upload rider-payment-receipt-upload">
              <strong>Payment receipt</strong>
              <p className="subtext">Step 2: upload the receipt after the receiver payment is confirmed.</p>
              <label className="receipt-upload-label" htmlFor="rider-payment-receipt">Choose payment receipt</label>
              <input
                id="rider-payment-receipt"
                className="receipt-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const selectedReceipt = event.target.files?.[0] || null;
                  event.target.value = "";
                  if (!selectedReceipt) {
                    setPaymentReceipt(null);
                    return;
                  }
                  const acceptedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "application/pdf",
                  ];
                  if (!acceptedTypes.includes(selectedReceipt.type)) {
                    setPaymentReceipt(null);
                    setPaymentDialog({
                      type: "error",
                      title: "Invalid receipt file",
                      message: "Receipt must be a JPEG, PNG, WebP, or PDF file.",
                    });
                    return;
                  }
                  if (
                    selectedReceipt.type === "application/pdf" &&
                    selectedReceipt.size > 3 * 1024 * 1024
                  ) {
                    setPaymentReceipt(null);
                    setPaymentDialog({
                      type: "error",
                      title: "Receipt file is too large",
                      message: "PDF receipts must be 3 MB or smaller.",
                    });
                    return;
                  }
                  setPaymentReceipt(selectedReceipt);
                  setPaymentDialog(null);
                  uploadPaymentReceipt.mutate(selectedReceipt);
                }}
              />
              <span className="receipt-file-name">
                {uploadPaymentReceipt.isPending
                  ? `Uploading ${paymentReceipt?.name || "receipt"}...`
                  : currentOrder?.paymentReceipts?.length
                    ? "Receipt uploaded"
                    : "Select a receipt to upload automatically"}
              </span>
              {uploadPaymentReceipt.isError ? <p className="form-error">{uploadPaymentReceipt.error instanceof Error ? uploadPaymentReceipt.error.message : "Could not upload the payment receipt."}</p> : null}
            </div>
          )}
          <div className="rider-action-stack">
            <p className="action-section-label">Step 1: Delivery verification</p>
            <div className="payment-action-row">
              <span className="status status-active">Verified</span>
              <strong>{deliveryCodeForAction || lookupCode}</strong>
            </div>
            <p className="action-section-label">Step 2: Payment confirmation</p>
            <div className="payment-action-row">

              {(currentOrder?.paymentMethod === "PAYMENT_ON_DELIVERY" &&
              currentOrder?.status === "PICKED_UP" && currentOrder?.paymentCoverage === "ITEM_AND_DELIVERY") && (
              <button
                type="button"
                className="button button-success"
                disabled={currentOrder?.receiverCollectionStatus === "COLLECTED" || receiverPaymentMutation.isPending}
                onClick={() => receiverPaymentMutation.mutate()}
              >
                <CheckCircle2 size={16} />
                {receiverPaymentMutation.isPending ? "Releasing payment..." : "Allow payment confirmation for sender"}
              </button>
              )}
              <span className={`status status-${(currentOrder?.receiverCollectionStatus || "PENDING").toLowerCase()}`}>
                {currentOrder?.receiverCollectionStatus === "COLLECTED" ? "PAID" : "PENDING"}
              </span>
            </div>
              
            {receiverPaymentMutation.isError && (
              <p className="form-error confirm-error">Receiver payment could not be confirmed</p>
            )}
            
            {/* {order.paymentMethod === "PAYMENT_ON_DELIVERY" &&
              order.status === "PICKED_UP" &&
              order.receiverCollectionStatus !== "COLLECTED" && (
                <button
                  type="button"
                  className="button button-warning button-full"
                  disabled={receiverPaymentMutation.isPending}
                  onClick={() => receiverPaymentMutation.mutate()}
                >
                  <CheckCircle2 size={16} />
                  {receiverPaymentMutation.isPending
                    ? "Releasing payment..."
                    : "Release payment for sender"}
                </button>
              )}
            {receiverPaymentMutation.isError && (
              <p className="form-error confirm-error">Receiver payment could not be confirmed.</p>
            )} */}
            <button
              type="button"
              className="button button-warning button-full"
              disabled={resendCodeMutation.isPending}
              onClick={() => resendCodeMutation.mutate()}
            >
              <Send size={16} />
              {resendCodeMutation.isPending ? "Sending Code..." : "Send delivery code via Whatsapp"}
            </button>
            {resendCodeMutation.isSuccess && (
              <p className="success-text" role="status">Delivery code sent by WhatsApp.</p>
            )}
            {resendCodeMutation.isError && (
              <p className="form-error confirm-error">Could not send the delivery code by WhatsApp.</p>
            )}
            <p className="action-section-label">Step 3: Sender confirmation</p>
            <p className="subtext">
              {currentOrder?.senderPaymentStatus === "PAID"
                ? "The sender has confirmed payment received. You can continue to final delivery confirmation."
                : "Waiting for the sender to confirm payment received before final delivery confirmation."}
            </p>
            <a
              className="button button-whatsapp button-full"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} /> Send delivery code via SMS
            </a>
          </div>
          <form
            className="confirm-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="code-confirmation">
              <div className="code-heading">
                <div>
                  <span className="code-eyebrow">Final step</span>
                  <h3>Confirm delivery</h3>
                </div>
                <ShieldCheck size={22} />
              </div>
              <p>Use the verified code to complete the handover after payment is confirmed.</p>
            <div className="field">
              <label htmlFor="delivery-code">Verified delivery code</label>
              <input
                className="input"
                id="delivery-code"
                required
                inputMode="numeric"
                value={deliveryCodeForAction}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="739284"
              />
            </div>
            {mutation.isError && (
              <p className="form-error confirm-error">
                Invalid order or delivery code.
              </p>
            )}
            <button
              className="button button-primary button-full"
              disabled={mutation.isPending || !orderIsReadyForFinalConfirmation}
            >
              {mutation.isPending ? "Confirming..." : "CONFIRM DELIVERY"}
            </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

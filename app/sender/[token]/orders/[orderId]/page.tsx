"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, PackageCheck, Send } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ErrorState,
  LoadingState,
  OrderStatusBadge,
} from "@/components/ui/primitives";

type Props = { params: Promise<{ token: string; orderId: string }> };

export default function SenderOrderDetailsPage({ params }: Props) {
  const { token, orderId } = use(params);
  const [error, setError] = useState<React.ReactNode>(null);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const orders = useQuery({
    queryKey: ["public-sender-orders", token],
    queryFn: () => api.getPublicSenderOrders(token),
  });
  const senderPaid = useMutation({
    mutationFn: () => api.senderPaid(orderId),
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Payment received status updated successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["public-sender-orders", token],
      });
    },
    onError: () =>
      setFeedback({
        type: "error",
        message: "Could not update payment status.",
      }),
  });
  const pickedUp = useMutation({
    mutationFn: () => api.senderPickedUp(token, orderId),
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Shipment marked as picked up successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["public-sender-orders", token],
      });
    },
    onError: () =>
      setFeedback({
        type: "error",
        message: "Could not update shipment status.",
      }),
  });
  const resendCode = useMutation({
    mutationFn: () => api.resendReceiverDeliveryCode(token),
    onSuccess: () =>
      setFeedback({
        type: "success",
        message: "Receiver delivery code sent successfully.",
      }),
    onError: () =>
      setFeedback({
        type: "error",
        message: "Could not resend the receiver code.",
      }),
  });

  useEffect(() => {
    document.title = "Sender order details";
  }, []);

  if (orders.isLoading) return <LoadingState label="Loading order" />;
  if (orders.isError)
    return (
      <main className="public-page">
        <div className="public-card">
          <ErrorState message="This sender link is unavailable." />
        </div>
      </main>
    );

  const order = orders.data?.find((item) => item.orderId === orderId);
  if (!order)
    return (
      <main className="public-page">
        <div className="public-card">
          <Link className="back-link" href={`/sender/${token}`}>
            <ArrowLeft size={16} /> Back to orders
          </Link>
          <h1>Order unavailable</h1>
          <p className="subtext">
            This order could not be found for this sender link.
          </p>
        </div>
      </main>
    );

  const images = (order.images || []).filter(
    (image) => image.publicUrl || image.url,
  );

  return (
    <main className="public-page">
      {feedback && (
        <div className="validation-dialog-backdrop">
          <section
            className={`validation-dialog action-feedback-${feedback.type}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="action-feedback-title"
          >
            <p className="eyebrow">
              {feedback.type === "success" ? "Success" : "Action failed"}
            </p>
            <h2 id="action-feedback-title">
              {feedback.type === "success"
                ? "Action completed"
                : "Please try again"}
            </h2>
            <p>{feedback.message}</p>
            <button
              type="button"
              className="button button-primary button-full"
              onClick={() => setFeedback(null)}
            >
              Continue
            </button>
          </section>
        </div>
      )}
      <div className="public-card sender-public">
        <Link className="back-link" href={`/sender/${token}`}>
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <header className="public-header detail-header">
          <div>
            <p className="eyebrow">Sender order details</p>
            <h1>{order.orderId}</h1>
          </div>
          <div className="sender-statuses">
            <OrderStatusBadge status={order.status} />
            <span
              className={`status sender-payment-status status-${order.senderPaymentStatus.toLowerCase()}`}
            >
              Sender payment: {order.senderPaymentStatus}
            </span>
          </div>
        </header>
        <section className="sender-actions" aria-label="Order actions">
          <div className="sender-action-card sender-code-action">
            <div className="sender-action-heading">
              <Send size={20} />
              <div>
                <h2>Receiver delivery code</h2>
                <p>Send the delivery code to the receiver again.</p>
              </div>
            </div>

            <button
              type="button"
              className="button button-warning button-full"
              disabled={resendCode.isPending}
              onClick={() => {
                if (order?.status !== "APPROVED") {
                  setFeedback({
                    type: "error",
                    message:
                      "Request not yet approved. Contact shagil or try again later.",
                  });
                } else if (
                  window.confirm(
                    "Are you sure you want to resend the delivery code to the receiver?",
                  )
                )
                  resendCode.mutate();
              }}
            >
              <Send size={16} />
              {resendCode.isPending
                ? "Sending code..."
                : "Resend receiver code"}
            </button>
          </div>
          <div className="sender-action-card sender-pickup-action">
            <div className="sender-action-heading">
              <PackageCheck size={20} />
              <div>
                <h2>Shipment picked up</h2>
                <p>Mark the shipment as collected by the assigned rider.</p>
              </div>
            </div>
            <button
              type="button"
              className="button button-info button-full"
              disabled={
                !order.assignedRiderId ||
                !["APPROVED"].includes(order.status) ||
                pickedUp.isPending
              }
              onClick={() => {
                if (order.status !== "APPROVED" && !order.assignedRiderId) {
                  setFeedback({
                    type: "error",
                    message:
                      "Cannot mark shipment as picked up. Delivery request not yet approved or no rider assigned. Please contact Shagil",
                  });
                } else if (
                  window.confirm(
                    "Are you sure you want to mark this shipment as picked up by the assigned rider?",
                  )
                )
                  pickedUp.mutate();
              }}
            >
              <PackageCheck size={16} />
              {pickedUp.isPending
                ? "Updating shipment..."
                : order.status === "PICKED_UP"
                  ? "Shipment picked up"
                  : "Mark shipment picked up"}
            </button>
          </div>
          <div className="sender-action-card sender-payment-action">
            <div className="sender-action-heading">
              <CheckCircle2 size={20} />
              <div>
                <h2>Payment received</h2>
                <p>
                  Status: <strong>{order.senderPaymentStatus}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              className="button button-success button-full"
              disabled={
                order.senderPaymentStatus === "PAID" ||
                order.receiverCollectionStatus !== "COLLECTED" ||
                senderPaid.isPending
              }
              onClick={() => {
                if (order.receiverCollectionStatus !== "COLLECTED" && order.status !== "PICKED_UP") {
                  setFeedback({
                    type: "error",
                    message:
                      "Cannot confirm payment received. The receiver has not yet confirmed the payment. Please contact your receiver ",
                  });
                } else if (
                  window.confirm(
                    "Confirm that payment has been received from the receiver?",
                  )
                )
                  senderPaid.mutate();
              }}
            >
              <CheckCircle2 size={16} />
              {senderPaid.isPending
                ? "Updating payment..."
                : order.senderPaymentStatus === "PAID"
                  ? "Payment received"
                  : "Confirm payment received"}
            </button>
            {order.receiverCollectionStatus !== "COLLECTED" &&
              order.senderPaymentStatus !== "PAID" && (
                <p className="muted">
                  Waiting for receiver payment collection confirmation.
                </p>
              )}
          </div>
        </section>

        <div className="public-facts">
          <div>
            <span>Sender</span>
            <strong>{order.senderName || "—"}</strong>
          </div>
          <div>
            <span>Sender phone</span>
            <strong>{order.senderPhoneNumber || "—"}</strong>
          </div>
          <div>
            <span>Receiver</span>
            <strong>{order.receiverName || "—"}</strong>
          </div>
          <div>
            <span>Receiver phone</span>
            <strong>{order.receiverPhoneNumber || "—"}</strong>
          </div>
          <div>
            <span>Delivery address</span>
            <strong>{order.deliveryAddress || "—"}</strong>
          </div>
          <div>
            <span>Delivery area</span>
            <strong>{order.deliveryZone?.name || "—"}</strong>
          </div>
          <div>
            <span>Delivery fee</span>
            <strong>₦{Number(order.deliveryFee).toLocaleString()}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>
              {order.paymentMethod === "PAYMENT_ON_DELIVERY"
                ? "Payment on delivery"
                : "Already paid"}
              {order.senderPaymentStatus === "PAID" ? " · Paid" : " · Pending"}
            </strong>
          </div>
        </div>

        {order.packageNotes && (
          <section className="public-note">
            <span>Package notes</span>
            <p>{order.packageNotes}</p>
          </section>
        )}

        {images.length > 0 && (
          <section className="sender-images">
            <h2>Product images</h2>
            <div className="public-image-grid">
              {images.map((image) => {
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
                      alt={image.originalFilename || image.name || "Product"}
                      width={720}
                      height={540}
                    />
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

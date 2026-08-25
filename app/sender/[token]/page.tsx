"use client";

import Image from "next/image";
import { use, useEffect } from "react";
import { CheckCircle2, PackageCheck, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

type Props = { params: Promise<{ token: string }> };

const labels: Record<string, string> = {
  PENDING: "Pending review",
  PENDING_APPROVAL: "Pending review",
  APPROVED: "Approved",
  WAITING_FOR_PACKAGE: "Waiting for package",
  PACKAGE_RECEIVED: "Package received",
  ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function SenderAccessPage({ params }: Props) {
  const { token } = use(params);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["public-sender", token],
    queryFn: () => api.getPublicSender(token),
  });
  const senderPaid = useMutation({
    mutationFn: () => api.senderPaid(query.data?.orderId || ""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["public-sender", token] }),
  });
  const pickedUp = useMutation({
    mutationFn: () =>
      api.senderPickedUp(query.data?.orderId || "", query.data?.assignedRiderId || ""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["public-sender", token] }),
  });
  const resendCode = useMutation({
    mutationFn: () => api.resendReceiverDeliveryCode(token),
  });

  useEffect(() => {
    document.title = "Your Shagil delivery";
  }, []);

  if (query.isLoading) return <LoadingState label="Loading your delivery" />;
  if (query.isError || !query.data)
    return (
      <main className="public-page">
        <div className="public-card">
          <p className="eyebrow">Shagil sender access</p>
          <h1>Delivery link unavailable</h1>
          <p className="subtext">This link may be invalid or expired.</p>
        </div>
      </main>
    );

  const order = query.data;
  const images = (order.images || []).filter(
    (image) => image.publicUrl || image.url,
  );
  console.log("query", order);
  const canMarkPickedUp = ["ASSIGNED", "APPROVED"].includes(order.status);

  return (
    <main className="public-page">
      <div className="public-card sender-public">
        <header className="public-header">
          <p className="eyebrow">Shagil sender access</p>
          <h1>{order.orderId}</h1>
          <span className="delivery-status">
            {labels[order.status] || order.status}
          </span>
          <p className="subtext">
            Keep track of the package details and delivery progress here.
          </p>
        </header>

            <section className="sender-actions" aria-label="Sender actions">
          <div className="sender-action-card sender-payment-action">
            <div className="sender-action-heading">
              <CheckCircle2 size={20} />
              <div>
                <h2>Payment received</h2>
                <p>
                  Status: <strong>{order.senderPaymentStatus || "PENDING"}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              className="button button-success button-full"
              disabled={order.senderPaymentStatus === "PAID" || senderPaid.isPending}
              onClick={() => {
                if (window.confirm("Are you sure you have received your payment?"))
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
            {senderPaid.isError && (
              <p className="form-error" role="alert">
                {senderPaid.error instanceof Error
                  ? senderPaid.error.message
                  : "Could not update payment status."}
              </p>
            )}
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
              className={`button button-info button-full${!canMarkPickedUp ? " button-loading" : ""}`}
              disabled={!canMarkPickedUp }
              onClick={() => pickedUp.mutate()}
            >
              <PackageCheck size={16} />
              {pickedUp.isPending ? "Updating shipment..." : "Shipment picked up"}
            </button>
            {pickedUp.isError && (
              <p className="form-error" role="alert">
                {pickedUp.error instanceof Error
                  ? pickedUp.error.message
                  : "Could not update shipment status."}
              </p>
            )}
          </div>

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
              onClick={() => resendCode.mutate()}
            >
              <Send size={16} />
              {resendCode.isPending ? "Sending code..." : "Resend code to receiver"}
            </button>
            {resendCode.isSuccess && (
              <p className="success-text" role="status">Delivery code sent to receiver.</p>
            )}
            {resendCode.isError && (
              <p className="form-error" role="alert">
                {resendCode.error instanceof Error
                  ? resendCode.error.message
                  : "Could not resend the delivery code."}
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
            <span>Product details</span>
            <strong>{order.orderDetails || "—"}</strong>
          </div>
          <div>
            <span>Quantity</span>
            <strong>{order.quantity || 1}</strong>
          </div>
          <div>
            <span>Delivery address</span>
            <strong>{order.deliveryAddress}</strong>
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
        <p className="public-refresh">This information is read-only.</p>
      </div>
    </main>
  );
}
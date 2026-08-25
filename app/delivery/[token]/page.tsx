"use client";

import { CheckCircle2, Circle, Copy, Phone } from "lucide-react";
import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";
import { DeliveryFeedback } from "@/components/feedback/delivery-feedback";

const timeline = [
  "PENDING",
  "APPROVED",
  "PACKAGE_RECEIVED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
const labels: Record<string, string> = {
  PENDING: "Order created",
  APPROVED: "Approved",
  PACKAGE_RECEIVED: "Package received",
  PICKED_UP: "Package picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};
export default function CustomerDeliveryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const query = useQuery({
    queryKey: ["customer-delivery", token],
    queryFn: () => api.getCustomerDelivery(token),
    refetchInterval: 30000,
  });
  useEffect(() => {
    document.title = "Track your Shagil delivery";
  }, []);
  if (query.isLoading) return <LoadingState label="Loading delivery" />;
  if (query.isError || !query.data)
    return (
      <main className="public-page">
        <div className="public-card">
          <p className="eyebrow">Shagil</p>
          <h1>Delivery link unavailable</h1>
          <p className="subtext">This link may be invalid or expired.</p>
        </div>
      </main>
    );
    const order = query.data;
    console.log("query", order);
  const current = timeline.indexOf(order.status);
  const amount = order.totalAmountToCollect ?? order.amount;
  const senderPhone = order.senderPhoneNumber || order.senderPhone;
  const riderPhone = order.assignedRider?.phone;
  const receiverPhone = order.receiverPhoneNumber || order.receiverPhone;
  return (
    <main className="public-page">
      <div className="public-card delivery-public">
        <header className="public-header">
          <p className="eyebrow">Your delivery</p>
          <h1>{order.orderId || "Delivery"}</h1>
          <span className="delivery-status">
            {labels[order.status] || order.status}
          </span>
        </header>
        <div className="delivery-code-card">
          <span>Delivery code</span>
          <strong>{order.deliveryCode || "Provided by sender"}</strong>
          <p>Show this code to the rider when your order is delivered.</p>
        </div>
        <section className="public-info-section">
          <h2>Sender information</h2>
          <div className="public-facts">
            <div>
              <span>Name</span>
              <strong>{order.senderName || order.customerName}</strong>
            </div>
            <div>
              <span>Phone</span>
              <PhoneNumber value={senderPhone} />
            </div>
          </div>
        </section>

        <section className="public-info-section">
          <h2>Rider information</h2>
          <div className="public-facts">
            <div>
              <span>Name</span>
              <strong>{order.assignedRider?.name || "Not assigned"}</strong>
            </div>
            <div>
              <span>Phone</span>
              <PhoneNumber value={riderPhone} />
            </div>
          </div>
        </section>

        {order.companyAccountName && (
          <section className="public-info-section">
            <h2>Account information</h2>
            <div className="public-facts">
              <div>
                <span>Account name</span>
                <strong>{order.companyAccountName}</strong>
              </div>
              <div>
                <span>Bank</span>
                <strong>{order.companyBankName}</strong>
              </div>
              <div>
                <span>Account number</span>
                <strong>{order.companyAccountNumber}</strong>
              </div>
            </div>
          </section>
        )}

        <section className="public-info-section">
          <h2>Product information</h2>
          <div className="public-facts">
            <div>
              <span>Product</span>
              <strong>{order.packageDescription || order.orderDetails || "—"}</strong>
            </div>
            <div>
              <span>Quantity</span>
              <strong>{order.quantity || 1}</strong>
            </div>
          </div>
          {order.packageNotes && (
            <div className="public-note">
              <span>Package notes</span>
              <p>{order.packageNotes}</p>
            </div>
          )}
          {order.images?.some((image) => image.publicUrl || image.url) ? (
            <div className="public-image-grid">
              {order.images.map((image) => {
                const imageUrl = image.publicUrl || image.url;
                return imageUrl ? (
                  <Image
                    key={image.id || imageUrl}
                    src={imageUrl}
                    alt={image.originalFilename || image.name || "Product"}
                    width={720}
                    height={540}
                  />
                ) : null;
              })}
            </div>
          ) : null}
        </section>

        <section className="public-info-section">
          <h2>Delivery information</h2>
          <div className="public-facts">
            <div>
              <span>Receiver</span>
              <strong>{order.receiverName || "—"}</strong>
            </div>
            <div>
              <span>Receiver phone</span>
              <PhoneNumber value={receiverPhone} />
            </div>
            <div>
              <span>Delivery address</span>
              <strong>{order.deliveryAddress}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>
                {order.receiverCollectionStatus === "COLLECTED"
                  ? "PAID ✓"
                  : order.paymentMethod === "PAYMENT_ON_DELIVERY"
                    ? "Payment on delivery"
                    : "Already paid ✓"}
              </strong>
            </div>
            {order.paymentMethod === "PAYMENT_ON_DELIVERY" &&
              order.receiverCollectionStatus !== "COLLECTED" && (
                <div>
                  <span>Amount to pay</span>
                  <strong>₦{Number(amount || 0).toLocaleString()}</strong>
                </div>
              )}
          </div>
        </section>
        <div className="timeline">
          {timeline.map((status, index) => (
            <div
              className={
                index <= current ? "timeline-item complete" : "timeline-item"
              }
              key={status}
            >
              {index <= current ? (
                <CheckCircle2 size={19} />
              ) : (
                <Circle size={19} />
              )}
              <span>{labels[status]}</span>
            </div>
          ))}
        </div>
        <DeliveryFeedback token={token} order={order} />
        <p className="public-refresh">Status refreshes automatically.</p>
      </div>
    </main>
  );
}

function PhoneNumber({ value }: { value?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <strong>—</strong>;

  async function copyNumber() {
    await navigator.clipboard.writeText(value as string);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <span className="phone-actions">
      <a href={`tel:${value}`} className="phone-link">
        <Phone size={14} />
        <strong>{value}</strong>
      </a>
      <button
        type="button"
        className="copy-phone"
        onClick={copyNumber}
        aria-label={`Copy ${value}`}
        title="Copy phone number"
      >
        <Copy size={14} />
      </button>
      {copied && <small role="status">Copied</small>}
    </span>
  );
}

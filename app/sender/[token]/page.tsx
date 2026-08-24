"use client";

import Image from "next/image";
import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const query = useQuery({
    queryKey: ["public-sender", token],
    queryFn: () => api.getPublicSender(token),
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
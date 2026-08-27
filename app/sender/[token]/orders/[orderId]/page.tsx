"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ErrorState,
  LoadingState,
  OrderStatusBadge,
} from "@/components/ui/primitives";

type Props = { params: Promise<{ token: string; orderId: string }> };

export default function SenderOrderDetailsPage({ params }: Props) {
  const { token, orderId } = use(params);
  const orders = useQuery({
    queryKey: ["public-sender-orders", token],
    queryFn: () => api.getPublicSenderOrders(token),
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
          <p className="subtext">This order could not be found for this sender link.</p>
        </div>
      </main>
    );

  const images = (order.images || []).filter(
    (image) => image.publicUrl || image.url,
  );

  return (
    <main className="public-page">
      <div className="public-card sender-public">
        <Link className="back-link" href={`/sender/${token}`}>
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <header className="public-header detail-header">
          <div>
            <p className="eyebrow">Sender order details</p>
            <h1>{order.orderId}</h1>
          </div>
          <OrderStatusBadge status={order.status} />
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

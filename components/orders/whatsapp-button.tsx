"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppButton({
  phone,
  customerName,
  orderId,
  deliveryCode,
}: {
  phone?: string;
  customerName: string;
  orderId: string;
  deliveryCode?: string;
}) {
  const digits = (phone || "").replace(/\D/g, "");
  const message = `Hello ${customerName},\n\nYour order has been created.\n\nOrder ID: ${orderId}${deliveryCode ? `\nDelivery Code: ${deliveryCode}` : ""}\n\nPlease keep these details available for delivery confirmation.\n\nThank you.`;
  return (
    <a
      className="button button-secondary"
      href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={17} /> Send via WhatsApp
    </a>
  );
}

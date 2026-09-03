"use client";

import Link from "next/link";
import { useState } from "react";
import type { ShopOrder } from "@/lib/types";

const formatMoney = (value: number | string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function ShopOrderSuccessPage() {
  const [order] = useState<ShopOrder | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("shagil-shop-order");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ShopOrder;
    } catch {
      window.sessionStorage.removeItem("shagil-shop-order");
      return null;
    }
  });

  return (
    <main className="shop-main empty-state-page">
      <div className="empty-state-card success-card">
        <span className="eyebrow success-eyebrow">Order received</span>
        <h2>Your order has been placed successfully.</h2>
        {order ? (
          <div className="order-success-details">
            <p>Order number: <strong>{order.orderNumber}</strong></p>
            <p>Status: <strong>{order.status}</strong></p>
            <p>Selected delivery zone: <strong>{order.deliveryZone?.name || order.deliveryZoneId}</strong></p>
            <div className="summary-row"><span>Subtotal</span><strong>{formatMoney(order.subtotal)}</strong></div>
            <div className="summary-row"><span>Total weight</span><strong>{Number(order.totalWeightKg || 0).toLocaleString()} kg</strong></div>
            <div className="summary-row"><span>Lagos delivery fee</span><strong>{formatMoney(order.deliveryFee)}</strong></div>
            <div className="summary-row total"><span>Total amount</span><strong>{formatMoney(order.total)}</strong></div>
            <p className="payment-method-note"><strong>Payment method</strong><span>Payment on Delivery</span></p>
          </div>
        ) : (
          <p>The company has received your order and will process it.</p>
        )}
        <div className="shop-hero-actions">
          <Link href="/shop" className="primary-button">Back to home</Link>
          <Link href="/shop/products" className="secondary-button">Continue shopping</Link>
        </div>
      </div>
    </main>
  );
}

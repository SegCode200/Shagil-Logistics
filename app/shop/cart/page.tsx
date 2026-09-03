"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useCart } from "@/components/shop/cart-context";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export default function ShopCartPage() {
  const { items, subtotal, totalWeightKg, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <main className="shop-main empty-state-page">
        <div className="empty-state-card">
          <h2>Your cart is empty</h2>
          <p>Add a few essentials to get started.</p>
          <Link href="/shop/products" className="primary-button">Browse products</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shop-main cart-page">
      <section className="shop-section cart-layout">
        <div className="cart-items-panel">
          <div className="section-heading cart-header">
            <div>
              <span className="eyebrow">Basket</span>
              <h2>Your cart</h2>
            </div>
            <button type="button" className="text-button" onClick={clearCart}>Clear cart</button>
          </div>

          {items.map((item) => (
            <div key={item.id} className="cart-item-row">
              <div className="cart-item-image">
                <Image src={item.image} alt={item.name} width={180} height={180} />
              </div>

              <div className="cart-item-details">
                <h3>{item.name}</h3>
                <p>{formatMoney(item.price)} each</p>
                <p>{item.weightKg.toLocaleString()} kg each</p>
                <p>{(item.weightKg * item.quantity).toLocaleString()} kg total</p>
              </div>

              <div className="cart-item-controls">
                <div className="quantity-box">
                  <button type="button" aria-label={`Reduce quantity for ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={`Increase quantity for ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.availableQuantity}>
                    <Plus size={14} />
                  </button>
                </div>
                <button type="button" className="text-button danger" onClick={() => removeItem(item.id)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              <strong className="cart-item-total">{formatMoney(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <h3>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Total weight</span>
            <strong>{totalWeightKg.toLocaleString()} kg</strong>
          </div>
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <Link href="/shop/checkout" className="primary-button checkout-button">Proceed to checkout</Link>
          <Button type="button" variant="secondary" className="secondary-button" onClick={() => window.history.back()}>
            Continue shopping
          </Button>
        </aside>
      </section>
    </main>
  );
}

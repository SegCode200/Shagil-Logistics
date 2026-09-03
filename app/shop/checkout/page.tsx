"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/shop/cart-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export default function ShopCheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const zones = useQuery({ queryKey: ["delivery-zones"], queryFn: api.getDeliveryZones });
  const settings = useQuery({ queryKey: ["company-settings"], queryFn: api.getSettings });
  const [customer, setCustomer] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerNote: "",
    deliveryZoneId: "",
  });
  const [confirm, setConfirm] = useState(false);
  const totalWeightKg = items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
  const shopBaseDeliveryFee = Number(settings.data?.shopBaseDeliveryFee ?? 0);
  const shopIncludedWeightKg = Number(settings.data?.shopIncludedWeightKg ?? 0);
  const shopExtraWeightFee = Number(settings.data?.shopExtraWeightFee ?? 0);
  const extraWeightKg = Math.max(0, totalWeightKg - shopIncludedWeightKg);
  const deliveryFee = shopBaseDeliveryFee + extraWeightKg * shopExtraWeightFee;
  const estimatedTotal = subtotal + deliveryFee;
  const createOrder = useMutation({
    mutationFn: () => api.createShopOrder({
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      customerEmail: customer.customerEmail || undefined,
      customerAddress: customer.customerAddress,
      customerNote: customer.customerNote || undefined,
      deliveryZoneId: customer.deliveryZoneId,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    }),
    onSuccess: (order) => {
      sessionStorage.setItem("shagil-shop-order", JSON.stringify(order));
      clearCart();
      router.push("/shop/order-success");
    },
  });

  if (items.length === 0) {
    return (
      <main className="shop-main empty-state-page">
        <div className="empty-state-card">
          <h2>Your cart is empty</h2>
          <p>Please add an item before checkout.</p>
          <Link href="/shop/products" className="primary-button">Continue shopping</Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirm) return;
    createOrder.mutate();
  }

  return (
    <main className="shop-main checkout-page">
      <section className="shop-section checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="section-heading left-align">
            <div>
              <span className="eyebrow">Checkout</span>
              <h2>Customer details</h2>
            </div>
          </div>

          <div className="field-grid">
            <label>
              Customer name <span className="required-mark">Required</span>
              <input id="customer-name" name="customerName" required value={customer.customerName} onChange={(event) => setCustomer({ ...customer, customerName: event.target.value })} />
            </label>
            <label>
              Customer phone <span className="required-mark">Required</span>
              <input id="customer-phone" name="customerPhone" type="tel" inputMode="tel" required value={customer.customerPhone} onChange={(event) => setCustomer({ ...customer, customerPhone: event.target.value })} />
            </label>
            <label className="full-width">
              Email address <span className="required-mark">Required</span>
              <input id="customer-email" name="customerEmail" type="email" required value={customer.customerEmail} onChange={(event) => setCustomer({ ...customer, customerEmail: event.target.value })} />
            </label>
            <label className="full-width">
              Delivery address <span className="required-mark">Required</span>
              <textarea id="customer-address" name="customerAddress" required rows={4} value={customer.customerAddress} onChange={(event) => setCustomer({ ...customer, customerAddress: event.target.value })} />
            </label>
            <div className="full-width checkout-zone-field">
              <label htmlFor="delivery-zone">Delivery zone</label>
              <div className="checkout-zone-select-wrap">
                <select
                  id="delivery-zone"
                  required
                  className="checkout-zone-select"
                  value={customer.deliveryZoneId}
                  onChange={(event) => setCustomer({ ...customer, deliveryZoneId: event.target.value })}
                  disabled={zones.isLoading || zones.isError}
                >
                  <option value="">
                    {zones.isLoading ? "Loading delivery zones..." : zones.isError ? "Unable to load zones" : "Choose your delivery area"}
                  </option>
                  {zones.data?.filter((zone) => zone.active !== false).map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} 
                    </option>
                  ))}
                </select>
              </div>
              <div className="checkout-zone-meta">
                <span>Select the area where your order should be delivered.</span>
              </div>
            </div>
            <label className="full-width">
              Additional note
              <textarea name="customerNote" rows={3} value={customer.customerNote} onChange={(event) => setCustomer({ ...customer, customerNote: event.target.value })} />
            </label>
          </div>

          <label className="confirmation-box">
            <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
            <span>I confirm my order details are correct and I am ready to place this order.</span>
          </label>

          <div className="payment-method-note">
            <strong>Payment method</strong>
            <span>Payment on Delivery</span>
          </div>

          {settings.isError ? <p className="form-error">Shop delivery settings are unavailable. Please try again later.</p> : null}
          {createOrder.isError ? <p className="form-error">We could not place your order. Please review your details and try again.</p> : null}
          <button type="submit" className="primary-button checkout-submit" disabled={!confirm || createOrder.isPending || zones.isLoading || settings.isLoading || settings.isError}>
            {createOrder.isPending ? "Placing order..." : "Place order"}
          </button>
        </form>

        <aside className="cart-summary">
          <h3>Order review</h3>
          {items.map((item) => (
            <div key={item.id} className="summary-item-row">
              <div>
                <strong>{item.name}</strong>
                <small>{item.quantity} × {formatMoney(item.price)}</small>
              </div>
              <span>{formatMoney(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Delivery fee</span>
            <strong>{settings.isLoading ? "Calculating..." : formatMoney(deliveryFee)}</strong>
          </div>
          <div className="summary-row total">
            <span>Estimated total</span>
            <strong>{settings.isLoading ? "Calculating..." : formatMoney(estimatedTotal)}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

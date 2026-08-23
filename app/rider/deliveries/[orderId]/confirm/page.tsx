"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { use, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/primitives";

type Props = { params: Promise<{ orderId: string }> };
export default function ConfirmDeliveryPage({ params }: Props) {
  const { orderId: routeOrderId } = use(params);
  const { user, isLoading } = useRoleRedirect("RIDER");
  const [orderId, setOrderId] = useState("");
  const [code, setCode] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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
  const mutation = useMutation({
    mutationFn: () => api.confirmDelivery({ orderId, deliveryCode: code }),
    onSuccess: (data) => {
      setConfirmedOrder(data);
      setConfirmed(true);
    },
  });
  const paymentMutation = useMutation({
    mutationFn: () => api.confirmPayment(routeOrderId, Number(amountReceived)),
    onSuccess: () => setPaymentReceived(true),
  });
  if (isLoading || !user || deliveries.isLoading) return <LoadingState />;
  if (deliveries.isError || !order)
    return (
      <AppShell role="RIDER">
        <div className="page">
          <ErrorState message="We couldn't find this delivery in your assigned orders." />
        </div>
      </AppShell>
    );
  if (confirmed)
    return (
      <AppShell role="RIDER">
        <div className="page confirm-page">
          <div className="success-card">
            <CheckCircle2 size={42} color="#2d9862" />
            <h2>Delivery confirmed</h2>
            <p>
              Order {confirmedOrder?.orderId || order.orderId || orderId}{" "}
              has been successfully delivered.
            </p>
            <dl className="detail-list">
              <div>
                <dt>Customer</dt>
                <dd>{order.customerName || "—"}</dd>
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
      <div className="page confirm-page">
        <Link href="/rider/dashboard" className="back-link">
          <ArrowLeft size={16} /> Back to deliveries
        </Link>
        <div className="confirm-box">
          <ShieldCheck size={25} color="#f3a189" />
          <h2>Confirm delivery</h2>
          <p className="subtext">
            Enter both details from the customer message.
          </p>
          <div className="delivery-summary">
            <strong>{order.customerName || "Delivery"}</strong>
            <span>{order.orderId || routeOrderId}</span>
            <p>{order.deliveryAddress}</p>
            <span>{order.paymentMethod === "PAYMENT_ON_DELIVERY" ? `Amount to collect: ₦${Number(order.totalAmount ?? order.amount ?? 0).toLocaleString()}` : "Already paid"}</span>
          </div>
          {order.paymentMethod === "PAYMENT_ON_DELIVERY" && !paymentReceived && (
            <div className="payment-check">
              <div className="field"><label htmlFor="amount-received">Amount received</label><input className="input" id="amount-received" type="number" min="0" step="0.01" required value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} /></div>
              {paymentMutation.isError && <p className="form-error confirm-error">Payment could not be confirmed. Check the amount and try again.</p>}
              <button type="button" className="button button-secondary button-full" disabled={paymentMutation.isPending || !amountReceived || Number(amountReceived) < 0} onClick={() => paymentMutation.mutate()}>{paymentMutation.isPending ? "Confirming payment..." : "Confirm payment"}</button>
            </div>
          )}
          {paymentReceived && <p className="payment-received">Payment received</p>}
          <form
            className="confirm-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="field">
              <label htmlFor="confirm-order">Order ID</label>
              <input
                className="input"
                id="confirm-order"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ORD-20260819-0001"
              />
            </div>
            <div className="field">
              <label htmlFor="delivery-code">Delivery code</label>
              <input
                className="input"
                id="delivery-code"
                required
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
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
              disabled={mutation.isPending || (order.paymentMethod === "PAYMENT_ON_DELIVERY" && !paymentReceived)}
            >
              {mutation.isPending ? "Confirming..." : "CONFIRM DELIVERY"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/primitives";

type Props = { params: Promise<{ orderId: string }> };
export default function ConfirmDeliveryPage({ params }: Props) {
  const { orderId: routeOrderId } = use(params);
  const { user, isLoading } = useRoleRedirect("RIDER");
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<null | {
    type: "success" | "error";
    title: string;
    message: string;
  }>(null);
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
    mutationFn: () => api.confirmDelivery({ orderId: routeOrderId, deliveryCode: code }),
    onSuccess: (data) => {
      setConfirmedOrder(data);
      setConfirmed(true);
    },
  });
  const companyPaymentMutation = useMutation({
    mutationFn: () => api.companyPaid(routeOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
  });
  const receiverPaymentMutation = useMutation({
    mutationFn: () => api.confirmReceiverPaymentForUser(routeOrderId),
    onSuccess: () => {
      setPaymentDialog({
        type: "success",
        title: "Release payment for sender",
        message: "Receiver payment has been confirmed and the sender can now be released.",
      });
      queryClient.invalidateQueries({ queryKey: ["rider-orders"] });
    },
    onError: () => {
      setPaymentDialog({
        type: "error",
        title: "Release payment for sender",
        message: "Could not confirm receiver payment. Please try again.",
      });
    },
  });
  const resendCodeMutation = useMutation({
    mutationFn: () => api.resendReceiverDeliveryCodeForUser(routeOrderId),
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
              Order {confirmedOrder?.orderId || order.orderId || routeOrderId} has
              been successfully delivered.
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
      {paymentDialog && (
        <div className="validation-dialog-backdrop">
          <section
            className="validation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rider-payment-dialog-title"
          >
            <p className="eyebrow">
              {paymentDialog.type === "success" ? "Success" : "Payment update failed"}
            </p>
            <h2 id="rider-payment-dialog-title">{paymentDialog.title}</h2>
            <p>{paymentDialog.message}</p>
            <button
              type="button"
              className="button button-primary button-full"
              onClick={() => setPaymentDialog(null)}
            >
              Continue
            </button>
          </section>
        </div>
      )}
      <div className="page confirm-page">
        <Link href="/rider/dashboard" className="back-link">
          <ArrowLeft size={16} /> Back to deliveries
        </Link>
        <div className="confirm-box">
          <div className="confirm-kicker">
            <ShieldCheck size={18} />
            <span>Active delivery</span>
          </div>
          <h2>Complete this delivery</h2>
          <p className="subtext">
            Manage this delivery and confirm it when the receiver provides the code.
          </p>
          <div className="delivery-summary delivery-summary-card">
            <div className="receiver-heading">
              <span className="receiver-avatar">
                {(order.receiverName || order.customerName || "R").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{order.receiverName || order.customerName || "Receiver"}</strong>
                <span>{order.orderId || routeOrderId}</span>
              </div>
            </div>
            {order.receiverPhoneNumber || order.receiverPhone ? (
              <a
                className="rider-phone-link"
                href={`tel:${order.receiverPhoneNumber || order.receiverPhone}`}
              >
                <Phone size={14} /> {order.receiverPhoneNumber || order.receiverPhone}
              </a>
            ) : null}
            <p className="delivery-address">{order.deliveryAddress}</p>
            <span className="collection-line">
              {order.paymentMethod === "PAYMENT_ON_DELIVERY"
                ? `Delivery fee to collect: ₦${Number(order.deliveryFee).toLocaleString()}`
                : "Already paid"}
            </span>
            <span
              className={`status status-${(order.receiverCollectionStatus || "NOT_COLLECTED").toLowerCase()}`}
            >
              {order.receiverCollectionStatus === "COLLECTED"
                ? "Receiver payment confirmed"
                : "Receiver payment pending"}
            </span>
          </div>
          <div className="rider-action-stack">
            <p className="action-section-label">Delivery controls</p>
            <div className="payment-action-row">
              <button
                type="button"
                className="button button-success"
                disabled={order.companyPaymentStatus === "PAID" || companyPaymentMutation.isPending}
                onClick={() => companyPaymentMutation.mutate()}
              >
                <CheckCircle2 size={16} />
                {companyPaymentMutation.isPending ? "Updating payment..." : "Payment received"}
              </button>
              <span className={`status status-${(order.companyPaymentStatus || "PENDING").toLowerCase()}`}>
                {order.companyPaymentStatus === "PAID" ? "PAID" : "PENDING"}
              </span>
            </div>
            {companyPaymentMutation.isError && (
              <p className="form-error confirm-error">Company payment could not be updated.</p>
            )}
            {order.paymentMethod === "PAYMENT_ON_DELIVERY" &&
              order.status === "PICKED_UP" &&
              order.receiverCollectionStatus !== "COLLECTED" && (
                <button
                  type="button"
                  className="button button-warning button-full"
                  disabled={receiverPaymentMutation.isPending}
                  onClick={() => receiverPaymentMutation.mutate()}
                >
                  <CheckCircle2 size={16} />
                  {receiverPaymentMutation.isPending
                    ? "Releasing payment..."
                    : "Release payment for sender"}
                </button>
              )}
            {receiverPaymentMutation.isError && (
              <p className="form-error confirm-error">Receiver payment could not be confirmed.</p>
            )}
            <button
              type="button"
              className="button button-warning button-full"
              disabled={resendCodeMutation.isPending}
              onClick={() => resendCodeMutation.mutate()}
            >
              <Send size={16} />
              {resendCodeMutation.isPending ? "Sending Code..." : "Send delivery code via Whatsapp"}
            </button>
            {resendCodeMutation.isSuccess && (
              <p className="success-text" role="status">Delivery code sent by WhatsApp.</p>
            )}
            {resendCodeMutation.isError && (
              <p className="form-error confirm-error">Could not send the delivery code by WhatsApp.</p>
            )}
            <a
              className="button button-whatsapp button-full"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} /> Send delivery code via SMS
            </a>
          </div>
          <form
            className="confirm-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="code-confirmation">
              <div className="code-heading">
                <div>
                  <span className="code-eyebrow">Final step</span>
                  <h3>Enter delivery code</h3>
                </div>
                <ShieldCheck size={22} />
              </div>
              <p>Ask the receiver for the code before completing the delivery.</p>
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
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Confirming..." : "CONFIRM DELIVERY"}
            </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft, Truck, Ban } from "lucide-react";
import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  formatDate,
} from "@/components/ui/primitives";
import { WhatsAppButton } from "@/components/orders/whatsapp-button";

type Props = { params: Promise<{ orderId: string }> };
export default function OrderDetailsPage({ params }: Props) {
  const { orderId } = use(params);
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: Boolean(user),
  });
  const action = useMutation({
    mutationFn: (type: "out" | "cancel") =>
      type === "out"
        ? api.markOutForDelivery(orderId)
        : api.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  if (isLoading || !user || query.isLoading) return <LoadingState />;
  if (query.isError || !query.data)
    return (
      <AppShell role="OWNER">
        <div className="page">
          <ErrorState message="We couldn't load this order." />
        </div>
      </AppShell>
    );
  const order = query.data;
  const amount = order.amount == null || order.amount === "" ? null : Number(order.amount);
  console.log("order details", order);
  return (
    <AppShell role="OWNER">
      <div className="page">
        <Link href="/owner/orders" className="back-link">
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <header className="page-header detail-header">
          <div>
            <p className="eyebrow">Order details</p>
            <h1>{order.orderId || order.id}</h1>
            <p className="subtext">Created {formatDate(order.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </header>
        <div className="detail-grid">
          <section className="detail-card">
            <h2>Customer information</h2>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{order.customerPhone || "—"}</dd>
              </div>
              <div>
                <dt>Delivery address</dt>
                <dd>{order.deliveryAddress}</dd>
              </div>
            </dl>
            <h2 className="section-gap">Order information</h2>
            <dl className="detail-list">
              <div>
                <dt>Details</dt>
                <dd>{order.orderDetails}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>
                  {amount !== null && Number.isFinite(amount)
                    ? amount.toFixed(2)
                    : "Not specified"}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(order.createdAt)}</dd>
              </div>
            </dl>
          </section>
          <aside className="detail-card">
            <h2>Delivery information</h2>
            <dl className="detail-list">
              <div>
                <dt>Assigned rider</dt>
                <dd>{order.assignedRider?.name || "Unassigned"}</dd>
              </div>
              <div>
                <dt>Delivery code</dt>
                <dd className="delivery-code">{order.deliveryCode || "—"}</dd>
              </div>
              <div>
                <dt>Delivered</dt>
                <dd>{formatDate(order.deliveredAt)}</dd>
              </div>
              {order.confirmedBy && (
                <div>
                  <dt>Confirmed by</dt>
                  <dd>{order.confirmedBy.name}</dd>
                </div>
              )}
            </dl>
            <div className="action-stack section-gap">
              {order.status === "PENDING" && (
                <>
                  <button
                    className="button button-primary button-full"
                    disabled={action.isPending}
                    onClick={() => action.mutate("out")}
                  >
                    <Truck size={17} /> Mark out for delivery
                  </button>
                  <button
                    className="button button-danger button-full"
                    disabled={action.isPending}
                    onClick={() => action.mutate("cancel")}
                  >
                    <Ban size={17} /> Cancel order
                  </button>
                </>
              )}
              {order.status === "OUT_FOR_DELIVERY" && (
                <button
                  className="button button-danger button-full"
                  disabled={action.isPending}
                  onClick={() => action.mutate("cancel")}
                >
                  <Ban size={17} /> Cancel order
                </button>
              )}
              <WhatsAppButton
                phone={order.customerPhone}
                customerName={order.customerName}
                orderId={order.orderId || order.id}
                deliveryCode={order.deliveryCode}
              />
            </div>
            {action.isError && (
              <p className="form-error">
                That action could not be completed. Please try again.
              </p>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

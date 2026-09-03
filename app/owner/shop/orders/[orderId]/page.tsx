"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/primitives";

const statuses = ["NEW", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
const money = (value: number | string) => Number(value || 0).toLocaleString();

export default function OwnerShopOrderDetailsPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const params = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ["shopOrder", params.orderId],
    queryFn: () => api.getShopOrder(params.orderId),
    enabled: Boolean(user && params.orderId),
  });
  const updateStatus = useMutation({
    mutationFn: (status: (typeof statuses)[number]) => api.updateShopOrderStatus(params.orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopOrder", params.orderId] });
      queryClient.invalidateQueries({ queryKey: ["shopOrders"] });
    },
  });

  if (authLoading || !user || order.isLoading) return <LoadingState label="Loading shop order" />;
  if (order.isError || !order.data) return <ErrorState message="Unable to load this shop order." />;
  const data = order.data;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Shop order</p>
            <h1>{data.orderNumber}</h1>
            <p className="subtext">Review purchase details and connected delivery progress.</p>
          </div>
          <Link href="/owner/shop/orders" className="button button-secondary">Back to orders</Link>
        </header>

        {updateStatus.isError ? <p className="form-error">The order status could not be updated. Please try again.</p> : null}
        <section className="panel settings-list">
          <div className="panel-heading"><h2>Order status</h2></div>
          <div className="panel-body" style={{ display: "grid", gap: 12 }}>
            <select className="input" value={data.status} onChange={(event) => updateStatus.mutate(event.target.value as (typeof statuses)[number])} disabled={updateStatus.isPending}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {updateStatus.isPending && data.status === "NEW" ? <p className="subtext">Starting processing will create the linked delivery order.</p> : null}
          </div>
        </section>

        <section className="panel settings-list">
          <div className="panel-heading"><h2>Customer and delivery</h2></div>
          <dl className="detail-list settings-detail-list">
            <div><dt>Customer</dt><dd>{data.customerName}</dd></div>
            <div><dt>Phone</dt><dd>{data.customerPhone}</dd></div>
            <div><dt>Address</dt><dd>{data.customerAddress}</dd></div>
            <div><dt>Delivery zone</dt><dd>{data.deliveryZone?.name || data.deliveryZoneId}</dd></div>
            <div><dt>Payment</dt><dd>Payment on Delivery {data.paymentStatus ? `(${data.paymentStatus})` : ""}</dd></div>
            <div><dt>Delivery status</dt><dd>{data.deliveryOrderStatus || "Not started"}</dd></div>
            <div><dt>Delivery code</dt><dd>{data.deliveryCode || "Not available"}</dd></div>
            <div><dt>Customer delivery link</dt><dd>{data.customerDeliveryLink || data.deliveryToken || "Not available"}</dd></div>
          </dl>
        </section>

        <section className="panel settings-list">
          <div className="panel-heading"><h2>Products and totals</h2></div>
          <div className="table-wrap">
            <table className="orders-table">
              <thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th></tr></thead>
              <tbody>{data.items.map((item) => <tr key={item.id}><td>{item.productName}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.subtotal)}</td></tr>)}</tbody>
            </table>
          </div>
          <dl className="detail-list settings-detail-list">
            <div><dt>Subtotal</dt><dd>₦{money(data.subtotal)}</dd></div>
            <div><dt>Total weight</dt><dd>{Number(data.totalWeightKg || 0).toLocaleString()} kg</dd></div>
            <div><dt>Delivery fee</dt><dd>₦{money(data.deliveryFee)}</dd></div>
            <div><dt>Total</dt><dd>₦{money(data.total)}</dd></div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
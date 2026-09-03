"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";

const shopStatuses = ["NEW", "PROCESSING", "COMPLETED", "CANCELLED"] as const;

export default function OwnerShopOrdersPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ["shopOrders"],
    queryFn: () => api.getShopOrders(1, 20),
    enabled: Boolean(user),
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: "NEW" | "PROCESSING" | "COMPLETED" | "CANCELLED" }) =>
      api.updateShopOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopOrders"] });
    },
  });

  if (authLoading || !user) return <LoadingState />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Storefront</p>
            <h1>Orders</h1>
            <p className="subtext">Track customer purchase orders from the shop.</p>
          </div>
        </header>

        {orders.isLoading ? (
          <LoadingState label="Loading shop orders" />
        ) : orders.isError ? (
          <ErrorState message="Unable to load shop orders." />
        ) : orders.data && orders.data.items.length === 0 ? (
          <EmptyState title="No shop orders yet" description="Customer orders will appear here once purchases begin." />
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <h2>Customer orders</h2>
            </div>
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Zone</th>
                    <th>Weight</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data?.items.map((order) => (
                    <tr key={order.id}>
                      <td><Link href={`/owner/shop/orders/${order.id}`} className="inline-link">{order.orderNumber}</Link></td>
                      <td>{order.customerName}</td>
                      <td>{order.customerPhone}</td>
                      <td>{order.deliveryZone?.name || order.deliveryZoneId}</td>
                      <td>{Number(order.totalWeightKg || 0).toLocaleString()} kg</td>
                      <td>{Number(order.total).toLocaleString()}</td>
                      <td>
                        <select
                          className="input"
                          value={order.status}
                          onChange={(event) =>
                            updateStatus.mutate({
                              orderId: order.id,
                              status: event.target.value as (typeof shopStatuses)[number],
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          {shopStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

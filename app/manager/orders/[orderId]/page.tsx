"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { use, useState } from "react";
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

type Props = { params: Promise<{ orderId: string }> };
export default function ManagerOrderDetailsPage({ params }: Props) {
  const { orderId } = use(params);
  const { user, isLoading } = useRoleRedirect("STATION_MANAGER");
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const order = useQuery({
    queryKey: ["managerOrder", orderId],
    queryFn: () => api.getManagerOrder(orderId),
    enabled: Boolean(user),
  });
  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: api.getRiders,
    enabled: Boolean(user),
  });
  const approve = useMutation({
    mutationFn: () => api.approveManagerOrder(orderId),
    onSuccess: () => {
      setNotice("Order approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  const assignRider = useMutation({
    mutationFn: (riderId: string) =>
      api.updateManagerOrder(orderId, { assignedRiderId: riderId }),
    onSuccess: () => {
      setNotice("Rider assigned successfully.");
      queryClient.invalidateQueries({ queryKey: ["managerOrder", orderId] });
      queryClient.invalidateQueries({ queryKey: ["managerOrders"] });
    },
  });
  if (isLoading || !user) return <LoadingState />;
  if (order.isLoading)
    return (
      <AppShell role="STATION_MANAGER">
        <LoadingState label="Loading order" />
      </AppShell>
    );
  if (order.isError || !order.data)
    return (
      <AppShell role="STATION_MANAGER">
        <div className="page">
          <ErrorState message="This order is unavailable." />
        </div>
      </AppShell>
    );
  const data = order.data;
  return (
    <AppShell role="STATION_MANAGER">
      <div className="page">
        <Link className="text-link" href="/manager/orders">
          <ArrowLeft size={15} /> Orders
        </Link>
        <header className="page-header">
          <div>
            <p className="eyebrow">Operational order</p>
            <h1>{data.orderId || data.id}</h1>
            <p className="subtext">Created {formatDate(data.createdAt)}</p>
          </div>
          <OrderStatusBadge status={data.status} />
        </header>
        {notice && (
          <p className="success-text">
            <Check size={16} /> {notice}
          </p>
        )}
        <section className="panel">
          <div className="panel-heading">
            <h2>Operations</h2>
          </div>
          <div className="panel-body detail-grid">
            <div>
              <span className="muted">Station</span>
              <strong>{data.station?.name || "-"}</strong>
            </div>
            <div>
              <span className="muted">Delivery zone</span>
              <strong>{data.deliveryZone?.name || data.deliveryAddress}</strong>
            </div>
            <div>
              <span className="muted">Manager</span>
              <strong>{data.managedBy?.name || "Awaiting manager"}</strong>
            </div>
            <div>
              <span className="muted">Rider</span>
              <strong>
                {data.assignedRider?.name || data.rider?.name || "Unassigned"}
              </strong>
            </div>
            <div>
              <span className="muted">Payment</span>
              <strong>
                {data.paymentMethod === "PAYMENT_ON_DELIVERY"
                  ? "Payment on delivery"
                  : data.paymentMethod === "ALREADY_PAID"
                    ? "Already paid"
                    : "-"}
              </strong>
            </div>
            <div>
              <span className="muted">Delivery fee</span>
              <strong>{data.deliveryFee ?? "-"}</strong>
            </div>
          </div>
          <div className="panel-body action-stack">
            {data.status === "PENDING_APPROVAL" && (
              <button
                className="button button-primary"
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
              >
                {approve.isPending ? "Approving order..." : "Approve order"}
              </button>
            )}
            <div className="field">
              <label htmlFor="manager-assign-rider">Assign rider</label>
              <select
                className="select"
                id="manager-assign-rider"
                disabled={riders.isLoading || assignRider.isPending}
                value={data.assignedRider?.id || data.rider?.id || ""}
                onChange={(event) => {
                  if (event.target.value) assignRider.mutate(event.target.value);
                }}
              >
                <option value="">Unassigned</option>
                {(riders.data || []).map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name}
                  </option>
                ))}
              </select>
              {assignRider.isPending && (
                <p className="assignment-status" role="status">
                  Assigning rider...
                </p>
              )}
            </div>
          </div>
          {(approve.isError || assignRider.isError) && (
            <p className="form-error">
              {((approve.error || assignRider.error) instanceof Error &&
                (approve.error || assignRider.error)?.message) ||
                "The order update could not be completed."}
            </p>
          )}
        </section>
        <section className="panel section-gap">
          <div className="panel-heading">
            <h2>Order history</h2>
          </div>
          <div className="panel-body">
            {data.events?.length ? (
              <div className="stack-list">
                {data.events.map((event) => (
                  <div className="detail-card" key={event.id}>
                    <strong>{event.type}</strong>
                    <span>
                      {formatDate(event.createdAt)}
                      {event.createdBy ? ` · ${event.createdBy.name}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No operational history available.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

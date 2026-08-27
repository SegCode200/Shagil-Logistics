"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/primitives";

export default function ManagerDashboard() {
  const { user, isLoading } = useRoleRedirect("STATION_MANAGER");
  const orders = useQuery({
    queryKey: ["managerOrders"],
    queryFn: api.getManagerOrders,
    enabled: Boolean(user),
  });
  if (isLoading || !user) return <LoadingState />;
  if (orders.isLoading)
    return (
      <AppShell role="STATION_MANAGER">
        <LoadingState label="Loading manager dashboard" />
      </AppShell>
    );
  if (orders.isError)
    return (
      <AppShell role="STATION_MANAGER">
        <div className="page">
          <ErrorState />
        </div>
      </AppShell>
    );
  const items = orders.data || [];
  const data = {
    totalOrders: items.length,
    newOrders: items.filter((order) => ["PENDING_APPROVAL"].includes(order.status)).length,
    alreadyPaid: items.filter((order) => order.paymentMethod === "ALREADY_PAID").length,
    paymentonDelvery: items.filter((order) => order.paymentMethod === "PAYMENT_ON_DELIVERY").length,
    totalTransactions: items.filter((order) => order.paymentMethod === "ALREADY_PAID" || order.paymentMethod === "PAYMENT_ON_DELIVERY").length,
    pickedUp: items.filter((order) => order.status === "PICKED_UP").length,
    delivered: items.filter((order) => order.status === "DELIVERED").length,
  };
  const metrics = [
    ["Total orders", data.totalOrders],
    ["Pending Approval", data.newOrders],
    ["Paid before Delivery", data.alreadyPaid],
    ["Payment on Delivery", data.paymentonDelvery],
    ["Total Transactions", data.totalTransactions],
    ["Picked up", data.pickedUp],
    ["Delivered", data.delivered],
  ];
  return (
    <AppShell role="STATION_MANAGER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Station operations</p>
            <h1>Manager dashboard</h1>
            <p className="subtext">
              Orders and delivery activity for your assigned stations.
            </p>
          </div>
          <Link className="button button-primary" href="/manager/orders">
            Open orders <ArrowUpRight size={17} />
          </Link>
        </header>
        <div className="summary-grid">
          {metrics.map(([label, value]) => (
            <Link
              className="summary-card summary-card-link"
              href={
                label === "Total orders"
                  ? "/manager/orders"
                  : label === "Pending Approval"
                    ? "/manager/orders?status=PENDING_APPROVAL"
                        : label === "Picked up"
                        ? "/manager/payment?:paymentMethod=PAYMENT_ON_DELIVERY"
                        : label === ""
                          ? "/manager/orders?status=PICKED_UP"
                          : label === "Delivered"
                            ? "/manager/orders?status=DELIVERED"
                            : "/manager/orders"
              }
              key={label}
            >
              <span>{label}</span>
              <strong>{value ?? "-"}</strong>
              <ArrowUpRight className="summary-card-arrow" size={16} />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

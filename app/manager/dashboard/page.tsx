"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const filteredItems = items.filter((order) => {
    const orderDate = order.createdAt.slice(0, 10);
    return (!fromDate || orderDate >= fromDate) && (!toDate || orderDate <= toDate);
  });
  const data = {
    totalOrders: items.length,
    newOrders: items.filter((order) => ["PENDING_APPROVAL"].includes(order.status)).length,
    alreadyPaid: items.filter((order) => order.paymentMethod === "ALREADY_PAID").length,
    paymentonDelvery: items.filter((order) => order.paymentMethod === "PAYMENT_ON_DELIVERY").length,
    totalTransactions: filteredItems.filter((order) => order.paymentMethod === "ALREADY_PAID" || order.paymentMethod === "PAYMENT_ON_DELIVERY").length,
    expectedTotal: filteredItems.reduce((sum, order) => sum + Number(order.totalAmountToCollect ?? order.deliveryFee ?? 0), 0),
    actualTotal: filteredItems.reduce((sum, order) => {
      const isPaid = order.finalPaymentStatus === "PAID" || order.senderPaymentStatus === "PAID" || order.paymentStatus === "PAID";
      return sum + (isPaid ? Number(order.totalAmountToCollect ?? order.deliveryFee ?? 0) : 0);
    }, 0),
    pickedUp: items.filter((order) => order.status === "PICKED_UP").length,
    delivered: items.filter((order) => order.status === "DELIVERED").length,
    express: items.filter((order) => order.deliveryType === "EXPRESS").length,
  };
  const balanceTotal = Math.max(0, data.expectedTotal - data.actualTotal);
  const metrics = [
    ["Total orders", data.totalOrders],
    ["Pending Approval", data.newOrders],
    ["Paid before Delivery", data.alreadyPaid],
    ["Payment on Delivery", data.paymentonDelvery],
    ["Total Transactions", data.totalTransactions],
    ["Picked up", data.pickedUp],
    ["Delivered", data.delivered],
    ["Express delivery", data.express],
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
        <div className="dashboard-transaction-filter">
          <label htmlFor="manager-dashboard-from-date">Transactions from</label>
          <input
            id="manager-dashboard-from-date"
            type="date"
            value={fromDate}
            max={todayKey}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <label htmlFor="manager-dashboard-to-date">to</label>
          <input
            id="manager-dashboard-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={todayKey}
            onChange={(event) => setToDate(event.target.value)}
          />
          {fromDate || toDate ? <button type="button" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button> : null}
          <span>Choose a date range</span>
        </div>
        <div className="summary-grid summary-grid-secondary">
          {[
            ["Total transactions", data.totalTransactions, `₦${Number(data.expectedTotal).toLocaleString()}`, "transactions"],
            ["Expected total", null, `₦${Number(data.expectedTotal).toLocaleString()}`, "expected"],
            ["Actual total", null, `₦${Number(data.actualTotal).toLocaleString()}`, "actual"],
            ["Balance total", null, `₦${Number(balanceTotal).toLocaleString()}`, "balance"],
          ].map(([label, value, amount, transaction]) => (
            <Link
              className="summary-card summary-card-secondary summary-card-link"
              href={`/manager/orders?${[
                fromDate ? `fromDate=${fromDate}` : "",
                toDate ? `toDate=${toDate}` : "",
                transaction === "pod-pending" ? "payment=PAYMENT_ON_DELIVERY&finalPaymentStatus=PENDING" : "",
                transaction === "pod-paid" ? "payment=PAYMENT_ON_DELIVERY&finalPaymentStatus=PAID" : "",
                ["transactions", "expected", "actual", "balance"].includes(transaction as string)
                  ? `transaction=${transaction}`
                  : "",
              ].filter(Boolean).join("&")}`}
              key={label}
            >
              <span>{label}</span>
              <strong>{value === null ? amount : amount === null ? value : `${value} · ${amount}`}</strong>
              <ArrowUpRight className="summary-card-arrow" size={16} />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";

const formatMoney = (value?: number | string | null) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? `₦${numeric.toLocaleString()}` : "₦0";
};

function getCommissionBreakdown(
  amount: number | string | null | undefined,
  settings?: { riderCommissionRate?: number | string } | null,
) {
  const commission = Number(amount ?? 0) || 0;
  const rate = Number(settings?.riderCommissionRate ?? 0) || 0;

  if (commission <= 0 || rate <= 0) {
    return null;
  }

  const baseFee = (commission * 100) / rate;

  return {
    baseFee,
    rate,
    commission,
    formula: `${formatMoney(baseFee)} × ${rate}% = ${formatMoney(commission)}`,
  };
}

export default function RiderCommissionPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("RIDER");
  const summaryQuery = useQuery({
    queryKey: ["rider-commission-summary"],
    queryFn: api.getCommissionSummary,
    enabled: Boolean(user),
  });
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
    enabled: Boolean(user),
  });

  if (authLoading || !user) return <LoadingState />;
  if (summaryQuery.isLoading) return <LoadingState label="Loading commission" />;
  if (summaryQuery.isError) return (
    <AppShell role="RIDER">
      <div className="page">
        <ErrorState message="We couldn't load your commission summary." />
      </div>
    </AppShell>
  );

  const summary = summaryQuery.data;
  const cards = [
    { label: "Today", value: formatMoney(summary?.todayCommission) },
    { label: "This month", value: formatMoney(summary?.monthCommission) },
    { label: "Total earned", value: formatMoney(summary?.totalCommission) },
    { label: "Paid", value: formatMoney(summary?.paidCommission) },
  ];

  return (
    <AppShell role="RIDER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Earnings</p>
            <h1>My commission</h1>
            <p className="subtext">Track what you have earned and what has been paid.</p>
          </div>
        </header>

        <section className="rider-summary-grid">
          {cards.map((card) => (
            <div className="rider-summary-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Commission history</p>
              <h2>Delivered orders</h2>
            </div>
          </div>
          <div className="panel-body">
            {(!summary?.deliveries || summary.deliveries.length === 0) ? (
              <EmptyState
                title="No commission yet"
                description="Your paid and pending delivery commissions will appear here."
              />
            ) : (
              <div className="commission-list">
                {summary.deliveries.map((delivery, index) => {
                  const breakdown = getCommissionBreakdown(
                    delivery.commission,
                    settings.data,
                  );

                  return (
                    <div
                      key={`${delivery.orderId}-${delivery.date ?? index}`}
                      className="commission-item"
                    >
                      <div className="commission-item-head">
                        <div>
                          <strong>{delivery.orderId}</strong>
                          <span>
                            <CalendarDays size={12} />
                            {delivery.date
                              ? new Intl.DateTimeFormat("en", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }).format(new Date(delivery.date))
                              : "Date unavailable"}
                          </span>
                        </div>
                        <div className="commission-amount">
                          {formatMoney(delivery.commission)}
                        </div>
                      </div>

                      {breakdown ? (
                        <div className="commission-breakdown">
                          <div>
                            <small>Base fee</small>
                            <strong>{formatMoney(breakdown.baseFee)}</strong>
                          </div>
                          <div>
                            <small>Rate</small>
                            <strong>{breakdown.rate}%</strong>
                          </div>
                          <div>
                            <small>Commission</small>
                            <strong>{formatMoney(breakdown.commission)}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="commission-breakdown single-line">
                          <small>Commission earned</small>
                          <strong>{formatMoney(delivery.commission)}</strong>
                        </div>
                      )}

                      <div className="commission-meta">
                        <span>
                          <Wallet size={12} />
                          {delivery.paymentStatus === "PAID" ? "Paid" : "Pending"}
                        </span>
                        <span>
                          <CheckCircle2 size={12} />
                          {delivery.companyPaymentStatus === "PAID"
                            ? "Company settled"
                            : "Company pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

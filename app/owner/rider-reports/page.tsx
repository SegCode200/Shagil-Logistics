"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import type { RiderReportStatus } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/primitives";

const statuses: RiderReportStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "DISMISSED",
];
export default function RiderReportsPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-rider-reports"],
    queryFn: api.getAdminRiderReportsList,
    enabled: Boolean(user),
  });
  const [status, setStatus] = useState("ALL");
  const update = useMutation({
    mutationFn: ({ id, value }: { id: string; value: RiderReportStatus }) =>
      api.updateAdminReportStatus(id, value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-rider-reports"] }),
  });
  if (isLoading || !user) return <LoadingState />;
  const reports = (query.data || []).filter(
    (report) => status === "ALL" || report.status === status,
  );
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Quality</p>
            <h1>Rider reports</h1>
            <p className="subtext">
              Review feedback and keep every delivery accountable.
            </p>
          </div>
          <select
            className="select report-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statuses.map((item) => (
              <option key={item}>{item.replace("_", " ")}</option>
            ))}
          </select>
        </header>
        {query.isLoading ? (
          <LoadingState label="Loading reports" />
        ) : query.isError ? (
          <ErrorState />
        ) : reports.length === 0 ? (
          <EmptyState
            title="No rider reports"
            description="Reports will appear here when customers submit them."
          />
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <article className="panel report-card" key={report.id}>
                <div>
                  <span className="report-status">
                    {report.status.replace("_", " ")}
                  </span>
                  <h2>{report.reason}</h2>
                  <p>{report.description}</p>
                  <small className="muted">
                    Order {report.orderId} ·{" "}
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(new Date(report.createdAt))}
                  </small>
                </div>
                <select
                  className="select"
                  value={report.status}
                  onChange={(event) =>
                    update.mutate({
                      id: report.id,
                      value: event.target.value as RiderReportStatus,
                    })
                  }
                  disabled={update.isPending}
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import { AlertCircle, CheckCircle2, PackageOpen } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading-stage" role="status" aria-live="polite">
      <div className="loading-visual">
        <div className="loading-orbit loading-orbit-one" />
        <div className="loading-orbit loading-orbit-two" />
        <div className="loading-logo">S</div>
      </div>
      <div className="loading-copy">
        <strong>{label}</strong>
        <span>Just a moment</span>
      </div>
      <div className="loading-track">
        <span />
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-box empty">
      <PackageOpen size={30} />
      <strong>{title}</strong>
      <span>{description}</span>
      {action}
    </div>
  );
}
export function ErrorState({
  message = "Unable to connect to the server. Please try again.",
}: {
  message?: string;
}) {
  return (
    <div className="state-box error">
      <AlertCircle size={22} />
      <span>{message}</span>
    </div>
  );
}
export function SuccessState({ children }: { children: React.ReactNode }) {
  return (
    <div className="state-box success">
      <CheckCircle2 size={22} />
      {children}
    </div>
  );
}
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const labels = {
    PENDING: "Pending",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}
export function formatDate(date?: string | null) {
  return date
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))
    : "—";
}

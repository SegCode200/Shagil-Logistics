"use client";

import { AlertCircle, CheckCircle2, PackageOpen } from "lucide-react";
import { useState } from "react";
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
    PENDING_APPROVAL: "Pending approval",
    APPROVED: "Approved",
    ASSIGNED: "Assigned",
    PICKED_UP: "Picked up",
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

export function Button({
  children,
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit" | "reset";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass =
    variant === "secondary"
      ? "button-secondary"
      : variant === "danger"
        ? "button-danger"
        : "button-primary";

  return (
    <button type={type} className={`button ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label || "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="searchable-select">
      <input
        className="input"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        required
      />
      {open && !disabled && (
        <div className="searchable-select-options" id={`${id}-options`} role="listbox">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                type="button"
                className="searchable-select-option"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(option.label);
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <span className="searchable-select-empty">No matching delivery area</span>
          )}
        </div>
      )}
    </div>
  );
}

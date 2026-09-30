"use client";

import { Check, Bike, Phone, Search, Truck } from "lucide-react";
import { useState } from "react";

export type RiderChoice = {
  id: string;
  name: string;
  phone: string;
  bikeId: string;
  pendingOrders: number;
};

export function getPendingOrderCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  const isPendingOrder = (order: unknown) => {
    if (!order || typeof order !== "object") return false;
    const status = (order as { status?: unknown }).status;
    return status !== "DELIVERED" && status !== "CANCELLED";
  };

  if (Array.isArray(value)) {
    return value.filter(isPendingOrder).length;
  }
  return isPendingOrder(value) ? 1 : 0;
}

export function getAssignedOrderCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (Array.isArray(value)) return value.length;
  return value && typeof value === "object" ? 1 : 0;
}

export function RiderPicker({
  id,
  riders,
  value,
  currentRiderName,
  disabled = false,
  onChange,
}: {
  id: string;
  riders: RiderChoice[];
  value: string;
  currentRiderName?: string;
  disabled?: boolean;
  onChange: (riderId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredRiders = riders.filter((rider) =>
    `${rider.name} ${rider.phone} ${rider.bikeId}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const selectedRider = riders.find((rider) => rider.id === value);

  return (
    <section className="rider-picker" aria-labelledby={`${id}-label`}>
      <div className="rider-picker-heading">
        <div>
          <strong id={`${id}-label`}>Choose a rider</strong>
          <span>{riders.length} available</span>
        </div>
        {currentRiderName && (
          <span className="rider-current-assignment">
            Current: {currentRiderName}
          </span>
        )}
      </div>
      <label className="rider-picker-search" htmlFor={`${id}-search`}>
        <Search size={16} aria-hidden="true" />
        <input
          id={`${id}-search`}
          type="search"
          value={search}
          placeholder="Search name, phone, or bike"
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="rider-picker-list" role="group" aria-label="Available riders">
        {filteredRiders.length ? (
          filteredRiders.map((rider) => {
            const selected = rider.id === value;
            const initials = rider.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();

            return (
              <button
                className={`rider-choice${selected ? " is-selected" : ""}`}
                type="button"
                key={rider.id}
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onChange(rider.id)}
              >
                <span className="rider-choice-avatar" aria-hidden="true">
                  {initials || "R"}
                </span>
                <span className="rider-choice-main">
                  <span className="rider-choice-name">{rider.name}</span>
                  <span className="rider-choice-details">
                    <span><Phone size={13} />{rider.phone || "No company phone"}</span>
                    <span><Bike size={14} />{rider.bikeId || "No bike listed"}</span>
                  </span>
                </span>
                <span className="rider-choice-load">
                  <Truck size={14} />
                  <strong>{rider.pendingOrders}</strong>
                  <small>pending</small>
                </span>
                <span className="rider-choice-check" aria-hidden="true">
                  {selected ? <Check size={16} /> : null}
                </span>
              </button>
            );
          })
        ) : (
          <p className="rider-picker-empty">
            {riders.length ? "No riders match your search." : "No riders with an assigned bike are available."}
          </p>
        )}
      </div>
      {selectedRider && (
        <p className="rider-picker-selection" role="status">
          Selected: <strong>{selectedRider.name}</strong>
        </p>
      )}
    </section>
  );
}

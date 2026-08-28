"use client";

import { Pencil, Plus, Send, Users } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { normalizeNigerianPhone } from "@/lib/phone";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/primitives";

export default function RidersPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const query = useQuery({
    queryKey: ["riders"],
    queryFn: api.getRiders,
    enabled: Boolean(user),
  });
  const bikes = useQuery({
    queryKey: ["bikes"],
    queryFn: api.getBikes,
    enabled: Boolean(user),
  });
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
    enabled: Boolean(user),
  });
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: { name: "", phone: "", address: "", zoneIds: [] as string[], bikeId: "" },
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const editForm = useForm({
    defaultValues: { name: "", zoneIds: [] as string[] },
  });
  const selectedEditZoneIds = useWatch({
    control: editForm.control,
    name: "zoneIds",
  });
  const mutation = useMutation({
    mutationFn: api.createRider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      setShowForm(false);
      form.reset();
    },
  });
  const update = useMutation({
    mutationFn: (values: { name: string; zoneIds: string[] }) =>
      api.updateRider(editingId as string, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      setEditingId(null);
    },
  });
  const resendAccess = useMutation({
    mutationFn: (riderId: string) => api.resendRiderAccess(riderId),
  });
  if (isLoading || !user) return <LoadingState />;
  return (
    <AppShell role="OWNER">
      <div className="page"> 
        <header className="page-header">
          <div>
            <p className="eyebrow">Team</p>
            <h1>Riders</h1>
            <p className="subtext">
              Manage the people completing your deliveries.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={18} /> Add rider
          </button>
        </header>
        {showForm && (
          <section className="panel rider-form panel-body">
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="rider-name">Name</label>
                  <input
                    className="input"
                    id="rider-name"
                    required
                    {...form.register("name")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="rider-phone">Phone</label>
                  <input
                    className="input"
                    id="rider-phone"
                    type="tel"
                    placeholder="+2347042604550"
                    required
                    {...form.register("phone", {
                      onBlur: (event) => form.setValue("phone", normalizeNigerianPhone(event.target.value)),
                    })}
                  />
                </div>
                <div className="field field-span">
                  <label htmlFor="rider-address">Address</label>
                  <input
                    className="input"
                    id="rider-address"
                    required
                    {...form.register("address")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="rider-bike">Bike</label>
                  <select className="select" id="rider-bike" required {...form.register("bikeId")}>
                    <option value="">Select a bike</option>
                    {(bikes.data || []).filter((bike) => bike.status !== "INACTIVE" && !bike.rider).map((bike) => (
                      <option key={bike.id} value={bike.id}>{bike.bikeId}</option>
                    ))}
                  </select>
                  {!bikes.isLoading && (bikes.data || []).filter((bike) => bike.status !== "INACTIVE" && !bike.rider).length === 0 && (
                    <span className="field-hint">Add an unassigned active bike first.</span>
                  )}
                </div>
                {/* <div className="field field-span">
                  <span className="field-label">Delivery zones</span>
                  <span className="field-hint">Select all zones this rider can serve.</span>
                  <div className="rider-zone-picker">
                    {(zones.data || []).filter((zone) => zone.active).map((zone) => {
                      const selected = selectedZoneIds.includes(zone.id);
                      return (
                        <label className={`rider-zone-option${selected ? " selected" : ""}`} key={zone.id}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) =>
                              form.setValue(
                                "zoneIds",
                                event.target.checked
                                  ? [...selectedZoneIds, zone.id]
                                  : selectedZoneIds.filter((id) => id !== zone.id),
                                { shouldDirty: true },
                              )
                            }
                          />
                          <span>{zone.name}</span>
                          <small>₦{Number(zone.fee).toLocaleString()}</small>
                        </label>
                      );
                    })}
                  </div>
                  {!zones.isLoading && !zones.isError && !(zones.data || []).some((zone) => zone.active) && (
                    <span className="muted">No active delivery zones available.</span>
                  )}
                </div> */}

              </div>
              {mutation.isError && (
                <p className="form-error">
                  Unable to add rider. Please try again.
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Adding..." : "Add rider"}
                </button>
              </div>
            </form>
          </section>
        )}
        {query.isLoading ? (
          <LoadingState label="Loading riders" />
        ) : query.isError ? (
          <ErrorState />
        ) : (query.data || []).length === 0 ? (
          <EmptyState
            title="No riders yet"
            description="Add a rider to start assigning deliveries."
            action={
              <button
                className="button button-primary"
                onClick={() => setShowForm(true)}
              >
                Add rider
              </button>
            }
          />
        ) : (
          <div className="rider-cards">
            {query.data?.map((rider) => (
              <article className="panel rider-card" key={rider.id}>
                <header>
                  <div className="avatar">
                    {rider.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span
                    className={
                      rider.active === false ? "inactive-dot" : "active-dot"
                    }
                  >
                    {rider.active === false ? "Inactive" : "Active"}
                  </span>
                </header>
                <h3>{rider.name}</h3>
                <p>{rider.phone || rider.email || "No contact details"}</p>
                <p className="muted">Bike: {bikes.data?.find((bike) => bike.id === rider.bikeId || bike.rider?.id === rider.id)?.bikeId || "No bike assigned"}</p>
                <span className="rider-rating-summary">{rider.averageRating != null ? `★ ${rider.averageRating.toFixed(1)} · ${rider.totalRatings || 0} ratings` : "No ratings yet"}</span>
                <span className="muted">
                  <Users size={14} /> {rider.assignedOrders || 0} assigned
                  orders
                </span>
                <button
                  className="button button-secondary rider-access-button"
                  disabled={resendAccess.isPending}
                  onClick={() => resendAccess.mutate(rider.id)}
                >
                  <Send size={15} />
                  {resendAccess.isPending ? "Sending..." : "Resend access link"}
                </button>
                <button
                  className="button button-secondary rider-access-button"
                  onClick={() => {
                    setEditingId(rider.id);
                    editForm.reset({ name: rider.name, zoneIds: rider.zoneIds || [] });
                  }}
                >
                  <Pencil size={15} /> Edit assignment
                </button>
                {editingId === rider.id && (
                  <form className="rider-edit-form" onSubmit={editForm.handleSubmit((values) => update.mutate(values))}>
                    <input className="input" aria-label="Rider name" {...editForm.register("name")} required />
                    <div className="rider-zone-picker">
                      {(zones.data || []).filter((zone) => zone.active).map((zone) => {
                        const selected = selectedEditZoneIds.includes(zone.id);
                        return (
                          <label className={`rider-zone-option${selected ? " selected" : ""}`} key={zone.id}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) =>
                                editForm.setValue(
                                  "zoneIds",
                                  event.target.checked
                                    ? [...selectedEditZoneIds, zone.id]
                                    : selectedEditZoneIds.filter((id) => id !== zone.id),
                                  { shouldDirty: true },
                                )
                              }
                            />
                            <span>{zone.name}</span>
                            <small>₦{Number(zone.fee).toLocaleString()}</small>
                          </label>
                        );
                      })}
                    </div>
                    <button className="button button-primary" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save changes"}</button>
                  </form>
                )}
                {resendAccess.isSuccess && resendAccess.variables === rider.id && (
                  <p className="success-text">Access link sent successfully.</p>
                )}
                {resendAccess.isError && resendAccess.variables === rider.id && (
                  <p className="form-error">Unable to resend the access link. Please try again.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

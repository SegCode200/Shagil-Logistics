"use client";

import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({ defaultValues: { name: "", phone: "" } });
  const mutation = useMutation({
    mutationFn: api.createRider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      setShowForm(false);
      form.reset();
    },
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
                <span className="rider-rating-summary">{rider.averageRating != null ? `★ ${rider.averageRating.toFixed(1)} · ${rider.totalRatings || 0} ratings` : "No ratings yet"}</span>
                <span className="muted">
                  <Users size={14} /> {rider.assignedOrders || 0} assigned
                  orders
                </span>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

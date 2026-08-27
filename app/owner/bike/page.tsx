"use client";

import { Bike, Plus, Unlink } from "lucide-react";
import { useState } from "react";
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

const emptyDraft = {
  bikeId: "",
  companyPhoneNumber: "",
  stationId: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
};

type Draft = typeof emptyDraft;

export default function OwnerBikePage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const bikes = useQuery({
    queryKey: ["bikes"],
    queryFn: api.getBikes,
    enabled: Boolean(user),
  });
  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: api.getRiders,
    enabled: Boolean(user),
  });
  const stations = useQuery({
    queryKey: ["stations"],
    queryFn: api.getStations,
    enabled: Boolean(user),
  });
  const create = useMutation({
    mutationFn: () =>
      api.createBike({
        ...draft,
        companyPhoneNumber: normalizeNigerianPhone(draft.companyPhoneNumber),
        stationId: draft.stationId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      setDraft(emptyDraft);
      setShowForm(false);
    },
  });
  const assign = useMutation({
    mutationFn: ({ bikeId, riderId }: { bikeId: string; riderId: string }) =>
      api.assignBike(bikeId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["riders"] });
    },
  });
  const remove = useMutation({
    mutationFn: (bikeId: string) => api.removeBikeRider(bikeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bikes"] });
      queryClient.invalidateQueries({ queryKey: ["riders"] });
    },
  });

  if (isLoading || !user) return <LoadingState />;
  const activeRiders = (riders.data || []).filter(
    (rider) => rider.active !== false,
  );

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Fleet</p>
            <h1>Bikes</h1>
            <p className="subtext">
              Register company bikes and assign them to riders.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setShowForm((open) => !open)}
          >
            <Plus size={18} /> Add bike
          </button>
        </header>
        {showForm && (
          <section className="panel panel-body">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                create.mutate();
              }}
            >
              <div className="form-grid">
                <Field
                  label="Bike ID"
                  value={draft.bikeId}
                  onChange={(value) => setDraft({ ...draft, bikeId: value })}
                  required
                />
                <Field
                  label="Company phone number"
                  type="tel"
                  value={draft.companyPhoneNumber}
                  onChange={(value) =>
                    setDraft({ ...draft, companyPhoneNumber: value })
                  }
                  required
                />
                <div className="field">
                  <label htmlFor="bike-station">Station</label>
                  <select
                    className="select"
                    id="bike-station"
                    value={draft.stationId}
                    onChange={(event) =>
                      setDraft({ ...draft, stationId: event.target.value })
                    }
                  >
                    <option value="">No station</option>
                    {(stations.data || []).map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Account name"
                  value={draft.accountName}
                  onChange={(value) =>
                    setDraft({ ...draft, accountName: value })
                  }
                  required
                />
                <Field
                  label="Account number"
                  value={draft.accountNumber}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  onChange={(value) =>
                    setDraft({ ...draft, accountNumber: value })
                  }
                  required
                />
                <Field
                  label="Bank name"
                  value={draft.bankName}
                  onChange={(value) => setDraft({ ...draft, bankName: value })}
                  required
                />
              </div>
              {create.isError && (
                <p className="form-error">
                  Bike could not be created. Check the details and try again.
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
                  disabled={create.isPending}
                >
                  {create.isPending ? "Creating..." : "Create bike"}
                </button>
              </div>
            </form>
          </section>
        )}
        {bikes.isLoading ? (
          <LoadingState label="Loading bikes" />
        ) : bikes.isError ? (
          <ErrorState />
        ) : (bikes.data || []).length === 0 ? (
          <EmptyState
            title="No bikes yet"
            description="Add a company bike to assign it to a rider."
            action={
              <button
                className="button button-primary"
                onClick={() => setShowForm(true)}
              >
                <Plus size={17} /> Add bike
              </button>
            }
          />
        ) : (
          <div className="rider-cards">
            {(bikes.data || []).map((bike) => (
              <article className="panel rider-card" key={bike.id}>
                <header>
                  <div className="avatar">
                    <Bike size={18} />
                  </div>
                  <span
                    className={
                      bike.status === "INACTIVE" ? "inactive-dot" : "active-dot"
                    }
                  >
                    {bike.status || "ACTIVE"}
                  </span>
                </header>
                <h3>{bike.bikeId}</h3>
                <p>{bike.companyPhoneNumber}</p>
                <p className="muted">
                  {bike.station?.name || "No station assigned"}
                </p>
                {bike.rider ? (
                  <p>
                    <strong>Rider:</strong> {bike.rider.name}
                  </p>
                ) : (
                  <p className="muted">No rider assigned</p>
                )}
                {bike.rider ? (
                  <button
                    className="button button-secondary rider-access-button"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(bike.id)}
                  >
                    <Unlink size={15} /> Remove rider
                  </button>
                ) : (
                  <label className="field">
                    <span className="field-label">Assign rider</span>
                    <select
                      className="select"
                      defaultValue=""
                      disabled={assign.isPending || riders.isLoading}
                      onChange={(event) => {
                        if (event.target.value)
                          assign.mutate({
                            bikeId: bike.id,
                            riderId: event.target.value,
                          });
                      }}
                    >
                      <option value="">Select a rider</option>
                      {activeRiders.map((rider) => (
                        <option key={rider.id} value={rider.id}>
                          {rider.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(assign.isError || remove.isError) && (
                  <p className="form-error">
                    Bike assignment could not be updated.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        pattern={pattern}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

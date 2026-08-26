"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/primitives";

export default function StationsPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const stations = useQuery({
    queryKey: ["stations"],
    queryFn: api.getStations,
    enabled: Boolean(user),
  });
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    address: "",
  });
  const create = useMutation({
    mutationFn: () => api.createStation(draft),
    onSuccess: () => {
      setDraft({
        name: "",
        address: "",
      });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });
  if (isLoading || !user) return <LoadingState />;
  const filtered = (stations.data || []).filter((station) =>
    station.name
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h1>Stations</h1>
            <p className="subtext">
              Organize managers, riders, and orders by station.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={17} /> Add station
          </button>
        </header>

        {showCreateForm && (
          <div
            className="import-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowCreateForm(false);
            }}
          >
            <section
              className="import-modal station-create-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-station-title"
            >
              <button
                type="button"
                className="icon-button"
                aria-label="Close add station dialog"
                onClick={() => setShowCreateForm(false)}
              >
                <X size={19} />
              </button>
              <h2 id="create-station-title">Add station</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  create.mutate();
                }}
              >
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="station-name">Station name</label>
                    <input
                      className="input"
                      id="station-name"
                      required
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="station-address">Address</label>
                    <input
                      className="input"
                      id="station-address"
                      value={draft.address}
                      onChange={(event) =>
                        setDraft({ ...draft, address: event.target.value })
                      }
                    />
                  </div>
                </div>
                {create.isError && (
                  <p className="form-error">
                    {create.error instanceof Error &&
                    create.error.message !== "REQUEST_FAILED"
                      ? create.error.message
                      : "Station could not be created. Please try again."}
                  </p>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button button-primary"
                    disabled={create.isPending}
                  >
                    <Plus size={17} />
                    {create.isPending ? "Creating..." : "Add station"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className="panel section-gap">
          <div className="panel-heading">
            <h2>All stations</h2>
            <input
              className="input"
              placeholder="Search stations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {stations.isLoading ? (
            <LoadingState label="Loading stations" />
          ) : stations.isError ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No stations have been created yet."
              description="Add a station to start organizing delivery operations."
            />
          ) : (
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Managers</th>
                    <th>Riders</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((station) => (
                    <tr key={station.id}>
                      <td className="order-ref">{station.name}</td>
                      <td>{station.managers?.length ?? "-"}</td>
                      <td>{station.riders?.length ?? "-"}</td>
                      <td>
                        <span
                          className={`status status-${station.status.toLowerCase()}`}
                        >
                          {station.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/owner/stations/${station.id}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

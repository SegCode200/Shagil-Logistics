"use client";

import { Eye, EyeOff, Plus, X } from "lucide-react";
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

export default function UsersPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const managers = useQuery({
    queryKey: ["managers"],
    queryFn: api.getManagers,
    enabled: Boolean(user),
  });
  const stations = useQuery({
    queryKey: ["stations"],
    queryFn: api.getStations,
    enabled: Boolean(user),
  });
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    password: "",
    stationId: "",
  });
  const create = useMutation({
    mutationFn: () => api.createManager(draft),
    onSuccess: () => {
      setDraft({ name: "", phone: "", password: "", stationId: "" });
      setShowPassword(false);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });
  console.log("managers")
  if (isLoading || !user) return <LoadingState />;
  const stationForManager = (managerId: string) =>
    stations.data?.find((station) =>
      station.managers?.some(
        (stationManager) =>
          stationManager.id === managerId ||
          stationManager.userId === managerId,
      ),
    );
  const managerStatus = (active?: boolean, status?: "ACTIVE" | "INACTIVE") =>
    status || (active === false ? "INACTIVE" : "ACTIVE");
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Team access</p>
            <h1>Station Managers</h1>
            <p className="subtext">
              Manage Station Managers and their station access.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setOpen(true)}
          >
            <Plus size={17} /> Add Station Manager
          </button>
        </header>
        {open && (
          <div
            className="import-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              className="import-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="manager-title"
            >
              <button
                type="button"
                className="icon-button"
                aria-label="Close manager dialog"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
              <h2 id="manager-title">Add Station Manager</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  create.mutate();
                }}
              >
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="user-manager-name">Name</label>
                    <input
                      className="input"
                      id="user-manager-name"
                      required
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-manager-phone">Phone</label>
                    <input
                      className="input"
                      id="user-manager-phone"
                      type="tel"
                      required
                      value={draft.phone}
                      onChange={(event) =>
                        setDraft({ ...draft, phone: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="user-manager-password">Password</label>
                    <div className="input-icon">
                      <input
                        className="input"
                        id="user-manager-password"
                        type={showPassword ? "text" : "password"}
                        minLength={6}
                        maxLength={128}
                        required
                        value={draft.password}
                        onChange={(event) =>
                          setDraft({ ...draft, password: event.target.value })
                        }
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="user-manager-station">Station</label>
                    <select
                      className="select"
                      id="user-manager-station"
                      required
                      value={draft.stationId}
                      onChange={(event) =>
                        setDraft({ ...draft, stationId: event.target.value })
                      }
                    >
                      <option value="">Select a station</option>
                      {(stations.data || []).map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {create.isError && (
                  <p className="form-error">
                    {create.error instanceof Error &&
                    create.error.message !== "REQUEST_FAILED"
                      ? create.error.message
                      : "Station manager could not be created. Please try again."}
                  </p>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button button-primary"
                    disabled={create.isPending || stations.isLoading}
                  >
                    {create.isPending ? "Creating..." : "Create manager"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        <section className="panel">
          <div className="panel-heading">
            <h2>Station Managers</h2>
          </div>
          {managers.isLoading ? (
            <LoadingState label="Loading users" />
          ) : managers.isError ? (
            <ErrorState />
          ) : (managers.data || []).length === 0 ? (
            <EmptyState
              title="No Station Managers yet"
              description="Add a Station Manager to manage station orders."
            />
          ) : (
            <>
              <div className="table-wrap desktop-table">
                <table className="orders-table users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone / Email</th>
                      <th>Station</th>
                      <th>Status</th>
                      <th>Active orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.data?.map((manager) => (
                      <tr key={manager.id}>
                        <td className="order-ref">{manager.name}</td>
                        <td>{manager.phone || manager.email || "Contact unavailable"}</td>
                        <td>
                          <strong>
                            {manager.station?.name ||
                              stations.data?.find((station) => station.id === manager.stationId)?.name ||
                              stationForManager(manager.id)?.name ||
                              "Not assigned"}
                          </strong>
                          {(manager.station?.stationCode || stationForManager(manager.id)?.stationCode) && (
                            <small className="muted block">
                              {manager.station?.stationCode || stationForManager(manager.id)?.stationCode}
                            </small>
                          )}
                        </td>
                        <td><span className={`status status-${managerStatus(manager.active, manager.status).toLowerCase()}`}>{managerStatus(manager.active, manager.status)}</span></td>
                        <td>{manager.currentOrders ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="user-mobile-list">
                {managers.data?.map((manager) => (
                  <article className="user-mobile-card" key={manager.id}>
                    <div className="user-mobile-card-header">
                      <strong>{manager.name}</strong>
                      <span className={`status status-${managerStatus(manager.active, manager.status).toLowerCase()}`}>{managerStatus(manager.active, manager.status)}</span>
                    </div>
                    <dl className="user-data-list">
                      <div><dt>Phone / Email</dt><dd>{manager.phone || manager.email || "Contact unavailable"}</dd></div>
                      <div>
                        <dt>Station</dt>
                        <dd>
                          {manager.station?.name || stations.data?.find((station) => station.id === manager.stationId)?.name || stationForManager(manager.id)?.name || "Not assigned"}
                          {(manager.station?.stationCode || stationForManager(manager.id)?.stationCode) && (
                            <small className="muted block">
                              {manager.station?.stationCode || stationForManager(manager.id)?.stationCode}
                            </small>
                          )}
                        </dd>
                      </div>
                      <div><dt>Active orders</dt><dd>{manager.currentOrders ?? 0}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

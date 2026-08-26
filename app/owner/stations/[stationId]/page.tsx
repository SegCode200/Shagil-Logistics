"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/primitives";

type Props = { params: Promise<{ stationId: string }> };
export default function StationDetailsPage({ params }: Props) {
  const { stationId } = use(params);
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("Overview");
  const [editingStation, setEditingStation] = useState(false);
  const [stationDraft, setStationDraft] = useState({ name: "", address: "" });
  const station = useQuery({
    queryKey: ["station", stationId],
    queryFn: () => api.getStation(stationId),
    enabled: Boolean(user),
  });
  const updateStation = useMutation({
    mutationFn: () => api.updateStation(stationId, stationDraft),
    onSuccess: () => {
      setEditingStation(false);
      queryClient.invalidateQueries({ queryKey: ["station", stationId] });
    },
  });
  if (isLoading || !user) return <LoadingState />;
  if (station.isLoading)
    return (
      <AppShell role="OWNER">
        <LoadingState label="Loading station" />
      </AppShell>
    );
  if (station.isError || !station.data)
    return (
      <AppShell role="OWNER">
        <div className="page">
          <ErrorState message="This station could not be found." />
        </div>
      </AppShell>
    );
  const data = station.data;
  const content =
    tab === "Managers" ? (
      <>
        {data.managers?.length ? (
          <div className="stack-list">
            {data.managers.map((manager) => (
              <div className="detail-card" key={manager.id}>
                <strong>{manager.name}</strong>
                <span>
                  {manager.email || manager.phone || "Contact unavailable"}
                </span>
                <span>
                  {manager.status || (manager.active === false ? "INACTIVE" : "ACTIVE")} · {manager.currentOrders ?? 0} active orders
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Station Managers assigned."
            description="Create and assign managers from the Users page."
          />
        )}
      </>
    ) : tab === "Riders" ? (
      data.riders?.length ? (
        <div className="stack-list">
          {data.riders.map((rider) => (
            <div className="detail-card" key={rider.id}>
              <strong>{rider.name}</strong>
              <span>{rider.riderId}</span>
              <span>
                {rider.status} ·{" "}
                {rider.rating ? `${rider.rating} rating` : "No rating"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No riders assigned to this station."
          description="Assign riders to this station."
        />
      )
    ) : (
      <div className="summary-grid">
        <div className="summary-card">
          <span>Station status</span>
          <strong>{data.status}</strong>
        </div>
        <div className="summary-card">
          <span>Managers</span>
          <strong>{data.managers?.length ?? "-"}</strong>
        </div>
        <div className="summary-card">
          <span>Riders</span>
          <strong>{data.riders?.length ?? "-"}</strong>
        </div>
      </div>
    );
  return (
    <AppShell role="OWNER">
      <div className="page">
        <Link className="text-link" href="/owner/stations">
          <ArrowLeft size={15} /> Stations
        </Link>
        <header className="page-header station-header">
          <div>
            <p className="eyebrow">Station details</p>
            <h1>{data.name}</h1>
            <p className="subtext">
              {data.address || "Address not provided"}
            </p>
          </div>
          <div className="inline-actions">
            <span className={`status status-${data.status.toLowerCase()}`}>
              {data.status}
            </span>
            <button
              className="button button-secondary"
              onClick={() => {
                setStationDraft({ name: data.name, address: data.address || "" });
                setEditingStation(true);
              }}
            >
              Edit station
            </button>
          </div>
        </header>
        {editingStation && (
          <section className="panel section-gap">
            <form
              className="panel-body"
              onSubmit={(event) => {
                event.preventDefault();
                updateStation.mutate();
              }}
            >
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="edit-station-name">Station name</label>
                  <input
                    className="input"
                    id="edit-station-name"
                    required
                    value={stationDraft.name}
                    onChange={(event) =>
                      setStationDraft({ ...stationDraft, name: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-station-address">Address</label>
                  <input
                    className="input"
                    id="edit-station-address"
                    value={stationDraft.address}
                    onChange={(event) =>
                      setStationDraft({ ...stationDraft, address: event.target.value })
                    }
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="button button-secondary" onClick={() => setEditingStation(false)}>
                    Cancel
                  </button>
                  <button className="button button-primary" disabled={updateStation.isPending}>
                    {updateStation.isPending ? "Saving..." : "Save station"}
                  </button>
                </div>
              </div>
              {updateStation.isError && <p className="form-error">Station could not be updated. Please try again.</p>}
            </form>
          </section>
        )}
        <div className="tabs">
          {[
            "Overview",
            "Managers",
            "Riders",
            "Orders",
            "Activity",
          ].map((item) => (
            <button
              className={tab === item ? "tab active" : "tab"}
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <section className="panel section-gap">
          <div className="panel-heading">
            <h2>{tab}</h2>
          </div>
          <div className="panel-body">
            {["Orders", "Activity"].includes(tab) ? (
              <EmptyState
                title={`${tab} data is not available yet.`}
                description="This view will display backend-provided operational history when the endpoint is enabled."
              />
            ) : (
              content
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

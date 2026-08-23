"use client";

import { Download, FileSpreadsheet, Plus, Save, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import type { DeliveryZoneImport } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/primitives";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
function friendlyError(error: unknown) {
  return error instanceof Error && error.message === "SESSION_EXPIRED"
    ? "Your session has expired. Please sign in again."
    : "This action could not be completed. Please try again.";
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ZonesPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
    enabled: Boolean(user),
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [draft, setDraft] = useState({ name: "", fee: "" });
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DeliveryZoneImport | null>(null);
  const [notice, setNotice] = useState("");
  const [fileError, setFileError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      api.createDeliveryZone({
        name: draft.name,
        fee: Number(draft.fee),
        active: true,
      }),
    onSuccess: () => {
      setDraft({ name: "", fee: "" });
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      setNotice("Delivery zone added successfully.");
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.updateDeliveryZone(id, { active }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] }),
  });
  const upload = useMutation({
    mutationFn: () => api.uploadDeliveryZoneExcel(file as File),
    onSuccess: (data) => {
        console.log("Upload result:", data);
      setFile(null);
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      setNotice(
        data.applied
          ? "Delivery zones updated successfully."
          : "Excel file contains errors. No changes were applied.",
      );
    },
  });
  const filtered = useMemo(
    () =>
      (query.data || []).filter(
        (zone) =>
          `${zone.id} ${zone.name}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (filter === "ALL" ||
            (filter === "ACTIVE" ? zone.active : !zone.active)),
      ),
    [query.data, search, filter],
  );
  function selectFile(candidate: File | undefined) {
    setFileError("");
    if (!candidate) return;
    if (
      !candidate.name.toLowerCase().endsWith(".xlsx") ||
      candidate.size > 5 * 1024 * 1024
    ) {
      setFileError("Please select a valid .xlsx Excel file under 5 MB.");
      return;
    }
    setFile(candidate);
  }
  async function exportFile(template = false) {
    try {
      const blob = template
        ? await api.downloadDeliveryZoneTemplate()
        : await api.exportDeliveryZones();
      download(
        blob,
        template
          ? "delivery-zones-template.xlsx"
          : `delivery-zones-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      setNotice(
        template
          ? "Template downloaded."
          : "Delivery zones exported successfully.",
      );
    } catch (error) {
      setNotice(friendlyError(error));
    }
  }
  if (isLoading || !user) return <LoadingState />;
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1>Delivery zones</h1>
            <p className="subtext">
              Changing a zone fee affects new orders only. Existing orders keep
              their current fee.
            </p>
          </div>
          <div className="zone-actions">
            <button
              className="button button-secondary"
              onClick={() => exportFile()}
            >
              <Download size={17} /> Download Excel
            </button>
            <button
              className="button button-secondary"
              onClick={() => exportFile(true)}
            >
              <FileSpreadsheet size={17} /> Download template
            </button>
            <button
              className="button button-primary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={17} /> Upload Excel
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </div>
        </header>
        {notice && <p className="success-text">{notice}</p>}
        {fileError && <p className="form-error">{fileError}</p>}
        <section className="panel">
          <form
            className="panel-body"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="zone-name">Location name</label>
                <input
                  className="input"
                  id="zone-name"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="zone-fee">Delivery fee</label>
                <input
                  className="input"
                  id="zone-fee"
                  required
                  min="0"
                  type="number"
                  value={draft.fee}
                  onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                />
              </div>
              <div className="form-actions field-span">
                <button
                  className="button button-primary"
                  disabled={mutation.isPending}
                >
                  <Plus size={17} /> Add location
                </button>
              </div>
            </div>
          </form>
        </section>
        <section className="panel section-gap">
          <div className="panel-heading">
            <div className="filters">
              <input
                className="input"
                placeholder="Search delivery location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <h2>Delivery locations</h2>
          </div>
          {query.isLoading ? (
            <LoadingState label="Loading locations" />
          ) : query.isError ? (
            <ErrorState />
          ) : !filtered.length ? (
            <EmptyState
              title="No matching locations"
              description="Try another search or add a delivery location."
            />
          ) : (
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Location ID</th>
                    <th>Location</th>
                    <th>Delivery fee</th>
                    <th>Status</th>
                    <th>Last updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((zone) => (
                    <tr key={zone.id}>
                      <td className="order-ref">{zone.id}</td>
                      <td>{zone.name}</td>
                      <td>₦{Number(zone.fee).toLocaleString()}</td>
                      <td>{zone.active ? "ACTIVE" : "INACTIVE"}</td>
                      <td>
                        {zone.updatedAt
                          ? new Intl.DateTimeFormat("en", {
                              dateStyle: "medium",
                            }).format(new Date(zone.updatedAt))
                          : "—"}
                      </td>
                      <td>
                        <button
                          className="button button-secondary"
                          onClick={() =>
                            toggle.mutate({ id: zone.id, active: !zone.active })
                          }
                        >
                          <Save size={15} />{" "}
                          {zone.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {result && (
          <section
            className={`panel import-result ${result.applied ? "import-result-success" : "import-result-failure"}`}
          >
            <div className="panel-heading">
              <h2>
                {result.applied
                  ? "Delivery zones updated successfully."
                  : "Excel file contains errors."}
              </h2>
              <button
                className="icon-button"
                aria-label="Close import result"
                onClick={() => setResult(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="panel-body">
              <div className="import-summary-grid">
                <Metric label="Total rows" value={result.summary.total} />
                <Metric label="Updated" value={result.summary.updated} />
                <Metric label="Unchanged" value={result.summary.unchanged} />
                <Metric label="Errors" value={result.summary.invalid} />
              </div>
              {result.errors.length > 0 && (
                <div className="import-errors">
                  {result.errors.map((error) => (
                    <p key={`${error.row}-${error.locationId || "row"}`}>
                      Row {error.row}
                      {error.locationId ? ` · ${error.locationId}` : ""}:{" "}
                      {error.errors.join(" ")}
                    </p>
                  ))}
                </div>
              )}
              {result.applied && result.changes.length > 0 && (
                <div className="table-wrap">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Old fee</th>
                        <th>New fee</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.changes.map((change) => (
                        <tr key={change.locationId}>
                          <td>{change.location}</td>
                          <td>₦{Number(change.oldFee).toLocaleString()}</td>
                          <td>₦{Number(change.newFee).toLocaleString()}</td>
                          <td>UPDATED</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="form-hint">
                Only locations included in this file were updated. Other
                locations remain unchanged. Existing orders keep their current
                delivery fees.
              </p>
            </div>
          </section>
        )}
      </div>
      {file && (
        <div className="import-modal-backdrop">
          <div className="import-modal">
            <button
              className="icon-button"
              aria-label="Close upload dialog"
              onClick={() => setFile(null)}
            >
              <X size={18} />
            </button>
            <h2>Import delivery zones</h2>
            <p>
              Selected file: <strong>{file.name}</strong>
            </p>
            <p>File size: {(file.size / 1024).toFixed(0)} KB</p>
            <p className="form-hint">
              Accepted file: .xlsx · Maximum size: 5 MB
            </p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                disabled={upload.isPending}
                onClick={() => setFile(null)}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={upload.isPending}
                onClick={() => upload.mutate()}
              >
                {upload.isPending ? "Uploading..." : "Upload Excel"}
              </button>
            </div>
            {upload.isError && (
              <p className="form-error">{friendlyError(upload.error)}</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

"use client";

import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

type SettingsForm = {
  maximumInsuranceValue: string;
  fixedDeliveryRate: string;
  variableDeliveryRate: string;
  riderCommissionRate: string;
  expressMultiplier: string;
  vat: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
};

const emptyForm: SettingsForm = {
  maximumInsuranceValue: "",
  fixedDeliveryRate: "",
  variableDeliveryRate: "",
  riderCommissionRate: "",
  vat: "",
  expressMultiplier: "1",
  accountName: "",
  accountNumber: "",
  bankName: "",
};

export default function OwnerSettingsPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
    enabled: Boolean(user),
  });
  const save = useMutation({
    mutationFn: () =>
      api.updateSettings({
        maximumInsuranceValue: Number(form.maximumInsuranceValue || 0),
        fixedDeliveryRate: Number(form.fixedDeliveryRate || 0),
        variableDeliveryRate: Number(form.variableDeliveryRate || 0),
        riderCommissionRate: Number(form.riderCommissionRate || 0),
        expressMultiplier: Number(form.expressMultiplier || 1),
        vat: Number(form.vat || 0),
        accountName: form.accountName || undefined,
        accountNumber: form.accountNumber || undefined,
        bankName: form.bankName || undefined,
      }),
    onSuccess: () => {
      setNotice("Settings updated successfully.");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
  const set = (key: keyof SettingsForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  function beginEditing() {
    if (!settings.data) return;
    setForm({
      maximumInsuranceValue: String(settings.data.maximumInsuranceValue),
      fixedDeliveryRate: String(settings.data.fixedDeliveryRate),
      variableDeliveryRate: String(settings.data.variableDeliveryRate),
      riderCommissionRate: String(settings.data.riderCommissionRate ?? 0),
      vat: String(settings.data.vat ?? 0),
      expressMultiplier: String(settings.data.expressMultiplier),
      accountName: settings.data.accountName || "",
      accountNumber: settings.data.accountNumber || "",
      bankName: settings.data.bankName || "",
    });
    setNotice("");
    setEditing(true);
  }

  if (isLoading || !user || settings.isLoading)
    return <LoadingState label="Loading settings" />;
  if (settings.isError) return <LoadingState label="Unable to load settings" />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Owner controls</p>
            <h1>Settings</h1>
            <p className="subtext">
              Manage insurance limits, delivery rates, and company payment
              details.
            </p>
          </div>
          {!editing && (
            <button className="button button-primary" onClick={beginEditing}>
              <Pencil size={17} /> Edit settings
            </button>
          )}
        </header>
        {notice && <p className="success-text">{notice}</p>}
        {!editing && settings.data && (
          <section className="panel settings-list">
            <div className="panel-heading">
              <h2>Current settings</h2>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Maximum insurance value</dt>
                <dd>
                  ₦
                  {Number(settings.data.maximumInsuranceValue).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt>Fixed delivery rate</dt>
                <dd>
                  ₦{Number(settings.data.fixedDeliveryRate).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt>Variable delivery rate</dt>
                <dd>
                  ₦{Number(settings.data.variableDeliveryRate).toLocaleString()} per KM
                </dd>
              </div>
              {/* Vat */}
              <div>
                <dt>VAT</dt>
                <dd>{Number(settings.data.vat ?? 0).toLocaleString()}%</dd>
              </div>
              <div>
                <dt>Rider commission rate</dt>
                <dd>
                  ₦{Number(settings.data.riderCommissionRate ?? 0).toLocaleString()} per delivery
                </dd>
              </div>
              <div>
                <dt>Express multiplier</dt>
                <dd>{settings.data.expressMultiplier}x</dd>
              </div>
              <div>
                <dt>Account name</dt>
                <dd>{settings.data.accountName || "Not set"}</dd>
              </div>
              <div>
                <dt>Account number</dt>
                <dd>{settings.data.accountNumber || "Not set"}</dd>
              </div>
              <div>
                <dt>Bank name</dt>
                <dd>{settings.data.bankName || "Not set"}</dd>
              </div>
            </dl>
          </section>
        )}
        {editing && (
          <form
            className="panel panel-body"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice("");
              save.mutate();
            }}
          >
            <div className="form-grid">
              <h2 className="field-span form-section-title">
                Delivery pricing
              </h2>
              <Field
                label="Maximum insurance value"
                type="number"
                min="0"
                step="0.01"
                value={form.maximumInsuranceValue}
                onChange={(value) => set("maximumInsuranceValue", value)}
              />
              <Field
                label="Fixed delivery rate"
                type="number"
                min="0"
                step="0.01"
                value={form.fixedDeliveryRate}
                onChange={(value) => set("fixedDeliveryRate", value)}
              />
              <Field
                label="Variable delivery rate"
                type="number"
                min="0"
                step="0.01"
                value={form.variableDeliveryRate}
                onChange={(value) => set("variableDeliveryRate", value)}
              />
              <Field
                label="VAT Rate in percentage"
                type="number"
                min="0"
                step="0.01"
                value={form.vat}
                onChange={(value) => set("vat", value)}
              />
              <h2 className="field-span form-section-title">
                Vat Rate in percentage
              </h2>
              <Field
                label="Rider commission rate"
                type="number"
                min="0"
                step="0.01"
                value={form.riderCommissionRate}
                onChange={(value) => set("riderCommissionRate", value)}
              />
              <Field
                label="Express multiplier"
                type="number"
                min="0.01"
                step="0.01"
                value={form.expressMultiplier}
                onChange={(value) => set("expressMultiplier", value)}
              />
              <h2 className="field-span form-section-title">
                Company payment account
              </h2>
              <Field
                label="Account name"
                value={form.accountName}
                onChange={(value) => set("accountName", value)}
              />
              <Field
                label="Account number"
                value={form.accountNumber}
                onChange={(value) => set("accountNumber", value)}
              />
              <Field
                label="Bank name"
                value={form.bankName}
                onChange={(value) => set("bankName", value)}
              />
            </div>
            {save.isError && (
              <p className="form-error">
                Settings could not be saved. Please check the values and try
                again.
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(false)}
              >
                <X size={17} /> Cancel
              </button>
              <button
                className="button button-primary"
                disabled={save.isPending}
              >
                <Save size={17} />
                {save.isPending ? "Saving..." : "Save settings"}
              </button>
            </div>
          </form>
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
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input"
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

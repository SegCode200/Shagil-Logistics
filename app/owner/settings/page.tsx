"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

type SettingsForm = {
  maximumInsuranceValue: string;
  fixedDeliveryRate: string;
  variableDeliveryRate: string;
  expressMultiplier: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
};

const emptyForm: SettingsForm = {
  maximumInsuranceValue: "",
  fixedDeliveryRate: "",
  variableDeliveryRate: "",
  expressMultiplier: "1",
  accountName: "",
  accountNumber: "",
  bankName: "",
};

export default function OwnerSettingsPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
    enabled: Boolean(user),
  });
  useEffect(() => {
    if (!settings.data) return;
    // Hydrate the editable form after the owner settings request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      maximumInsuranceValue: String(settings.data.maximumInsuranceValue),
      fixedDeliveryRate: String(settings.data.fixedDeliveryRate),
      variableDeliveryRate: String(settings.data.variableDeliveryRate),
      expressMultiplier: String(settings.data.expressMultiplier),
      accountName: settings.data.accountName || "",
      accountNumber: settings.data.accountNumber || "",
      bankName: settings.data.bankName || "",
    });
  }, [settings.data]);
  const save = useMutation({
    mutationFn: () =>
      api.updateSettings({
        maximumInsuranceValue: Number(form.maximumInsuranceValue || 0),
        fixedDeliveryRate: Number(form.fixedDeliveryRate || 0),
        variableDeliveryRate: Number(form.variableDeliveryRate || 0),
        expressMultiplier: Number(form.expressMultiplier || 1),
        accountName: form.accountName || undefined,
        accountNumber: form.accountNumber || undefined,
        bankName: form.bankName || undefined,
      }),
    onSuccess: () => {
      setNotice("Settings updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
  const set = (key: keyof SettingsForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (isLoading || !user || settings.isLoading) return <LoadingState label="Loading settings" />;
  if (settings.isError) return <LoadingState label="Unable to load settings" />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div><p className="eyebrow">Owner controls</p><h1>Settings</h1><p className="subtext">Manage insurance limits, delivery rates, and company payment details.</p></div>
        </header>
        {notice && <p className="success-text">{notice}</p>}
        <form className="panel panel-body" onSubmit={(event) => { event.preventDefault(); setNotice(""); save.mutate(); }}>
          <div className="form-grid">
            <h2 className="field-span form-section-title">Delivery pricing</h2>
            <Field label="Maximum insurance value" type="number" min="0" step="0.01" value={form.maximumInsuranceValue} onChange={(value) => set("maximumInsuranceValue", value)} />
            <Field label="Fixed delivery rate" type="number" min="0" step="0.01" value={form.fixedDeliveryRate} onChange={(value) => set("fixedDeliveryRate", value)} />
            <Field label="Variable delivery rate" type="number" min="0" step="0.01" value={form.variableDeliveryRate} onChange={(value) => set("variableDeliveryRate", value)} />
            <Field label="Express multiplier" type="number" min="0.01" step="0.01" value={form.expressMultiplier} onChange={(value) => set("expressMultiplier", value)} />
            <h2 className="field-span form-section-title">Company payment account</h2>
            <Field label="Account name" value={form.accountName} onChange={(value) => set("accountName", value)} />
            <Field label="Account number" value={form.accountNumber} onChange={(value) => set("accountNumber", value)} />
            <Field label="Bank name" value={form.bankName} onChange={(value) => set("bankName", value)} />
          </div>
          {save.isError && <p className="form-error">Settings could not be saved. Please check the values and try again.</p>}
          <div className="form-actions"><button className="button button-primary" disabled={save.isPending}><Save size={17} />{save.isPending ? "Saving..." : "Save settings"}</button></div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text", min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string }) {
  return <div className="field"><label>{label}</label><input className="input" type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

"use client";

import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

type ShopSettingsForm = {
  shopBaseDeliveryFee: string;
  shopIncludedWeightKg: string;
  shopExtraWeightFee: string;
};

const emptyForm: ShopSettingsForm = {
  shopBaseDeliveryFee: "",
  shopIncludedWeightKg: "0",
  shopExtraWeightFee: "",
};

export default function OwnerShopSettingsPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ShopSettingsForm>(emptyForm);
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
        shopBaseDeliveryFee: Number(form.shopBaseDeliveryFee || 0),
        shopIncludedWeightKg: Number(form.shopIncludedWeightKg || 0),
        shopExtraWeightFee: Number(form.shopExtraWeightFee || 0),
      }),
    onSuccess: () => {
      setNotice("Shop settings updated successfully.");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
  const set = (key: keyof ShopSettingsForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function beginEditing() {
    if (!settings.data) return;
    setForm({
      shopBaseDeliveryFee: String(settings.data.shopBaseDeliveryFee ?? 0),
      shopIncludedWeightKg: String(settings.data.shopIncludedWeightKg ?? 0),
      shopExtraWeightFee: String(settings.data.shopExtraWeightFee ?? 0),
    });
    setNotice("");
    setEditing(true);
  }

  if (isLoading || !user || settings.isLoading)
    return <LoadingState label="Loading shop settings" />;
  if (settings.isError) return <LoadingState label="Unable to load shop settings" />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Shop controls</p>
            <h1>Shop settings</h1>
            <p className="subtext">
              Manage delivery pricing for products purchased through the shop.
            </p>
          </div>
          {!editing && (
            <button className="button button-primary" onClick={beginEditing}>
              <Pencil size={17} /> Edit shop settings
            </button>
          )}
        </header>

        {notice && <p className="success-text">{notice}</p>}

        {!editing && settings.data && (
          <section className="panel settings-list">
            <div className="panel-heading">
              <h2>Current shop delivery settings</h2>
            </div>
            <dl className="detail-list settings-detail-list">
              <div>
                <dt>Shop base delivery fee</dt>
                <dd>₦{Number(settings.data.shopBaseDeliveryFee ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Included weight</dt>
                <dd>{Number(settings.data.shopIncludedWeightKg ?? 0).toLocaleString()} kg</dd>
              </div>
              <div>
                <dt>Extra weight fee</dt>
                <dd>₦{Number(settings.data.shopExtraWeightFee ?? 0).toLocaleString()} per kg</dd>
              </div>
            </dl>
          </section>
        )}

        {editing && (
          <form
            className="panel settings-form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice("");
              save.mutate();
            }}
          >
            <div className="settings-form-section">
              <h2>Shop delivery pricing</h2>
              <div className="form-grid">
                <Field
                  label="Shop base delivery fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shopBaseDeliveryFee}
                  onChange={(value) => set("shopBaseDeliveryFee", value)}
                />
                <Field
                  label="Included weight (kg)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shopIncludedWeightKg}
                  onChange={(value) => set("shopIncludedWeightKg", value)}
                />
                <Field
                  label="Extra weight fee per kg"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shopExtraWeightFee}
                  onChange={(value) => set("shopExtraWeightFee", value)}
                />
              </div>
            </div>
            {save.isError && (
              <p className="form-error">Shop settings could not be saved. Please try again.</p>
            )}
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEditing(false)}>
                <X size={17} /> Cancel
              </button>
              <button className="button button-primary" disabled={save.isPending}>
                <Save size={17} />
                {save.isPending ? "Saving..." : "Save shop settings"}
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

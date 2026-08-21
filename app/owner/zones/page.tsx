"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";

export default function ZonesPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["delivery-zones"], queryFn: api.getDeliveryZones, enabled: Boolean(user) });
  const [draft, setDraft] = useState({ name: "", fee: "" });
  const mutation = useMutation({
    mutationFn: () => api.createDeliveryZone({ name: draft.name, fee: Number(draft.fee), active: true }),
    onSuccess: () => { setDraft({ name: "", fee: "" }); queryClient.invalidateQueries({ queryKey: ["delivery-zones"] }); },
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.updateDeliveryZone(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-zones"] }),
  });
  if (isLoading || !user) return <LoadingState />;
  return <AppShell role="OWNER"><div className="page">
    <header className="page-header"><div><p className="eyebrow">Pricing</p><h1>Delivery zones</h1><p className="subtext">Fees are managed centrally and calculated by the backend.</p></div></header>
    <section className="panel panel-body"><form className="form-grid" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <div className="field"><label htmlFor="zone-name">Zone name</label><input className="input" id="zone-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Lekki" /></div>
      <div className="field"><label htmlFor="zone-fee">Delivery fee</label><input className="input" id="zone-fee" required min="0" type="number" value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} placeholder="2500" /></div>
      <div className="form-actions field-span"><button className="button button-primary" disabled={mutation.isPending}><Plus size={17} /> Add zone</button></div>
    </form></section>
    <section className="panel section-gap"><div className="panel-heading"><h2>Configured zones</h2></div>
      {query.isLoading ? <LoadingState label="Loading zones" /> : query.isError ? <ErrorState /> : !query.data?.length ? <EmptyState title="No delivery zones" description="Add your first zone and fee above." /> : <div className="table-wrap"><table className="orders-table"><thead><tr><th>Zone</th><th>Fee</th><th>Status</th><th /></tr></thead><tbody>{query.data.map((zone) => <tr key={zone.id}><td className="order-ref">{zone.name}</td><td>₦{Number(zone.fee).toLocaleString()}</td><td>{zone.active ? "Active" : "Inactive"}</td><td><button className="button button-secondary" onClick={() => toggle.mutate({ id: zone.id, active: !zone.active })}><Save size={15} /> {zone.active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>}
    </section>
  </div></AppShell>;
}

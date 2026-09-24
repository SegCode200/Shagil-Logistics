"use client";

import { Plus, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
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

export default function ManagerLinkCustomerPage() {
  const { user, isLoading } = useRoleRedirect("STATION_MANAGER");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ name: "", phone: "", whatsappPhone: "", additionalPhones: [""] });
  const [notice, setNotice] = useState("");
  const senders = useQuery({
    queryKey: ["senders"],
    queryFn: api.getSenders,
    enabled: Boolean(user),
  });
  const create = useMutation({
    mutationFn: () =>
      api.createSenderAccess({
        name: draft.name,
        phone: normalizeNigerianPhone(draft.phone),
        whatsappPhone: draft.whatsappPhone ? normalizeNigerianPhone(draft.whatsappPhone) : undefined,
        additionalPhones: draft.additionalPhones.filter(Boolean).map(normalizeNigerianPhone),
      }),
    onSuccess: () => {
      setDraft({ name: "", phone: "", whatsappPhone: "", additionalPhones: [""] });
      setShowForm(false);
      setNotice("Customer access link created successfully.");
      queryClient.invalidateQueries({ queryKey: ["senders"] });
    },
  });
  const resend = useMutation({
    mutationFn: (senderId: string) => api.resendSenderAccess(senderId),
    onSuccess: () => setNotice("Access token sent successfully."),
  });
  const filteredSenders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (senders.data || []).filter((sender) =>
      `${sender.name} ${sender.phone} ${sender.whatsappPhone || ""} ${(sender.additionalPhones || []).join(" ")}`.toLowerCase().includes(term),
    );
  }, [senders.data, search]);

  if (isLoading || !user) return <LoadingState />;

  return (
    <AppShell role="STATION_MANAGER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Station operations</p>
            <h1>Link customers</h1>
            <p className="subtext">
              Manage sender accounts and resend their access links.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setShowForm((open) => !open)}
          >
            <Plus size={17} /> Add link customer
          </button>
        </header>
        {notice && <p className="success-text">{notice}</p>}
        {showForm && (
          <section className="panel">
            <form
              className="panel-body"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice("");
                create.mutate();
              }}
            >
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="manager-customer-name">Customer name</label>
                  <input
                    className="input"
                    id="manager-customer-name"
                    required
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                  />
                </div>
                <div className="field"><label htmlFor="manager-customer-whatsapp">WhatsApp number</label><input className="input" id="manager-customer-whatsapp" type="tel" placeholder="Defaults to phone number" value={draft.whatsappPhone} onChange={(event) => setDraft({ ...draft, whatsappPhone: event.target.value })} /></div>
                <div className="field field-span"><label>Additional phone numbers</label>{draft.additionalPhones.map((phone, index) => <div className="input-icon" key={index}><input className="input" type="tel" value={phone} onChange={(event) => setDraft({ ...draft, additionalPhones: draft.additionalPhones.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />{draft.additionalPhones.length > 1 && <button type="button" className="icon-button" aria-label="Remove phone number" onClick={() => setDraft({ ...draft, additionalPhones: draft.additionalPhones.filter((_, itemIndex) => itemIndex !== index) })}><X size={16} /></button>}</div>)}{draft.additionalPhones.length < 10 && <button type="button" className="button button-secondary" onClick={() => setDraft({ ...draft, additionalPhones: [...draft.additionalPhones, ""] })}>Add another number</button>}</div>
                <div className="field">
                  <label htmlFor="manager-customer-phone">Phone number</label>
                  <input
                    className="input"
                    id="manager-customer-phone"
                    type="tel"
                    required
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft({ ...draft, phone: event.target.value })
                    }
                    onBlur={() =>
                      setDraft({
                        ...draft,
                        phone: normalizeNigerianPhone(draft.phone),
                      })
                    }
                  />
                </div>
                {create.isError && (
                  <p className="form-error field-span">
                    Customer access could not be created. Please try again.
                  </p>
                )}
                <div className="form-actions field-span">
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
                    <Plus size={17} />
                    {create.isPending ? "Creating..." : "Create access link"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}
        <section className="panel">
          <div className="panel-heading">
            <h2>Registered link customers</h2>
            <span className="muted">{filteredSenders.length} shown</span>
          </div>
          <div className="panel-body customer-search">
            <div className="input-icon search">
              <Search size={16} />
              <input
                className="input"
                aria-label="Search customers"
                placeholder="Search by name or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          {senders.isLoading ? (
            <LoadingState label="Loading customers" />
          ) : senders.isError ? (
            <ErrorState />
          ) : filteredSenders.length === 0 ? (
            <EmptyState
              title={search ? "No customers found" : "No linked customers yet"}
              description={
                search
                  ? "Try another name or phone number."
                  : "Add a customer to create their sender access link."
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="orders-table users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>WhatsApp</th>
                    <th>Status</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSenders.map((sender) => (
                    <tr key={sender.id}>
                      <td className="order-ref">{sender.name}</td>
                      <td>{sender.phone}</td>
                      <td>{sender.whatsappPhone || sender.phone}</td>
                      <td>
                        <span
                          className={
                            sender.active ? "active-dot" : "inactive-dot"
                          }
                        >
                          {sender.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="button button-secondary"
                          disabled={resend.isPending}
                          onClick={() => resend.mutate(sender.id)}
                        >
                          <Send size={15} />
                          {resend.isPending && resend.variables === sender.id
                            ? "Sending..."
                            : "Resend access"}
                        </button>
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

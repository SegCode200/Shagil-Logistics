"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Plus, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { normalizeNigerianPhone } from "@/lib/phone";

export default function SenderRegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [additionalPhones, setAdditionalPhones] = useState([""]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ accessToken?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedPhones = [
      phone,
      ...(whatsappPhone ? [whatsappPhone] : []),
      ...additionalPhones.filter(Boolean),
    ].map(normalizeNigerianPhone);
    if (new Set(normalizedPhones).size !== normalizedPhones.length) {
      setError("Phone numbers must be unique. Please remove any duplicate numbers.");
      return;
    }
    setBusy(true);
    try {
      const sender = await api.createSenderPublic({
        name: name.trim(),
        phone: normalizedPhones[0],
        whatsappPhone: whatsappPhone ? normalizeNigerianPhone(whatsappPhone) : undefined,
        additionalPhones: additionalPhones.filter(Boolean).map(normalizeNigerianPhone),
      });
      setCreated(sender);
    } catch (registrationError) {
      setError(
        registrationError instanceof Error && registrationError.message !== "REQUEST_FAILED"
          ? registrationError.message
          : "Registration could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const senderPath = created.accessToken ? `/sender/${created.accessToken}` : "/sender/register";
    return (
      <main className="public-page">
        <div className="public-card success-card">
          <CheckCircle2 size={40} color="#2d9862" />
          <h1>Registration complete</h1>
          <p className="subtext">Your sender access link has been created.</p>
          <Link className="button button-primary" href={senderPath}>
            Open sender page <ArrowRight size={17} />
          </Link>
          <p className="muted">The access link will also be sent to your registered contact.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="public-page">
      <div className="public-card">
        <header className="public-header">
          <p className="eyebrow">Shagil sender registration</p>
          <h1>Create your sender account</h1>
          <p className="subtext">Register your contact details to receive delivery access links.</p>
        </header>
        <form className="public-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="sender-register-name">Name or business name</label>
            <input className="input" id="sender-register-name" required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sender-register-phone">Main phone number</label>
            <input className="input" id="sender-register-phone" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sender-register-whatsapp">WhatsApp number</label>
            <input className="input" id="sender-register-whatsapp" type="tel" placeholder="Defaults to main phone" value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} />
          </div>
          <div className="field">
            <label>Additional phone numbers</label>
            {additionalPhones.map((additionalPhone, index) => (
              <div className="input-icon" key={index}>
                <input className="input" type="tel" value={additionalPhone} onChange={(event) => setAdditionalPhones((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
                {additionalPhones.length > 1 && <button type="button" className="icon-button" aria-label="Remove phone number" onClick={() => setAdditionalPhones((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>}
              </div>
            ))}
            {additionalPhones.length < 10 && <button type="button" className="button button-secondary" onClick={() => setAdditionalPhones((current) => [...current, ""])}><Plus size={16} /> Add another number</button>}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>
            {busy ? "Registering..." : <>Register as sender <ArrowRight size={17} /></>}
          </button>
        </form>
      </div>
    </main>
  );
}

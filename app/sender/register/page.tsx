"use client";

import { ArrowRight, CheckCircle2, Plus, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";

export default function SenderRegisterPage() {
  const [phone, setPhone] = useState("");
  const [additionalPhones, setAdditionalPhones] = useState([""]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ senderPath: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedPhone = normalizeNigerianPhone(phone);
    const normalizedAdditionalPhones = additionalPhones
      .filter(Boolean)
      .map(normalizeNigerianPhone);
    if (!isNigerianPhone(normalizedPhone)) {
      setError(
        "Enter a complete Nigerian mobile number for your WhatsApp / main phone.",
      );
      return;
    }
    if (
      normalizedAdditionalPhones.some(
        (additionalPhone) => !isNigerianPhone(additionalPhone),
      )
    ) {
      setError(
        "Every additional number must be a complete Nigerian mobile number.",
      );
      return;
    }
    const normalizedPhones = [normalizedPhone, ...normalizedAdditionalPhones];
    if (new Set(normalizedPhones).size !== normalizedPhones.length) {
      setError(
        "Phone numbers must be unique. Please remove any duplicate numbers.",
      );
      return;
    }
    setBusy(true);
    try {
      const sender = await api.createSenderPublic({
        name: normalizedPhone,
        phone: normalizedPhone,
        whatsappPhone: normalizedPhone,
        additionalPhones: normalizedAdditionalPhones,
      });
      setCreated(sender);
    } catch (registrationError) {
      setError(
        registrationError instanceof Error &&
          registrationError.message !== "REQUEST_FAILED"
          ? registrationError.message
          : "Registration could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <main className="public-page">
        <div className="public-card success-card">
          <CheckCircle2 size={40} color="#2d9862" />
          <h1>Registration complete</h1>
          <p className="subtext">
            Your sender account is ready. No WhatsApp message has been sent.
          </p>
          <p className="muted">
            Select Enter to open your sender page.
          </p>
          <Link
            className="button button-primary button-full"
            href={created.senderPath}
          >
            Enter <ArrowRight size={17} />
          </Link>
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
          <p className="subtext">
            Enter your WhatsApp number and any additional contact numbers.
          </p>
        </header>
        <form className="public-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="sender-register-phone">WhatsApp number</label>
            <input
              className="input"
              id="sender-register-phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setPhone(normalizeNigerianPhone(phone))}
            />
            <small className="field-help">
              This will also be saved as your main phone number. No WhatsApp
              message will be sent.
            </small>
          </div>
          <div className="field">
            <label>Additional phone numbers</label>
            {additionalPhones.map((additionalPhone, index) => (
              <div className="input-icon" key={index}>
                <input
                  className="input"
                  type="tel"
                  value={additionalPhone}
                  onChange={(event) =>
                    setAdditionalPhones((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                  onBlur={() =>
                    setAdditionalPhones((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? normalizeNigerianPhone(item)
                          : item,
                      ),
                    )
                  }
                />
                {additionalPhones.length > 1 && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove phone number"
                    onClick={() =>
                      setAdditionalPhones((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {additionalPhones.length < 10 && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  setAdditionalPhones((current) => [...current, ""])
                }
              >
                <Plus size={16} /> Add another number
              </button>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>
            {busy ? (
              "Registering..."
            ) : (
              <>
                Register as sender <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

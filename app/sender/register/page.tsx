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
      <main className="public-page sender-register-page">
        <div className="public-card sender-register-card sender-register-success">
          <CheckCircle2 size={36} color="#2d9862" aria-hidden="true" />
          <h1>You’re registered</h1>
          <p>Your sender account is ready.</p>
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
    <main className="public-page sender-register-page">
      <div className="public-card sender-register-card">
        <header className="sender-register-header">
          <p className="eyebrow">Shagil</p>
          <h1>Register as a sender</h1>
          <p>
            Enter your WhatsApp number and optional extra numbers. No message
            will be sent.
          </p>
        </header>
        <form className="sender-register-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="sender-register-phone">WhatsApp number</label>
            <input
              className="input"
              id="sender-register-phone"
              type="tel"
              required
              placeholder="+234..."
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={() => setPhone(normalizeNigerianPhone(phone))}
            />
          </div>
          <fieldset className="field sender-register-additional">
            <legend>Additional numbers <span>(optional)</span></legend>
            {additionalPhones.map((additionalPhone, index) => (
              <div className="input-icon" key={index}>
                <input
                  className="input"
                  type="tel"
                  aria-label={`Additional phone number ${index + 1}`}
                  placeholder="Phone number"
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
                    aria-label={`Remove additional phone number ${index + 1}`}
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
                className="sender-register-add-button"
                onClick={() =>
                  setAdditionalPhones((current) => [...current, ""])
                }
              >
                <Plus size={15} /> Add another
              </button>
            )}
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>
            {busy ? (
              "Registering..."
            ) : (
              <>
                Register <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

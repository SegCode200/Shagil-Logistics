"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Plus, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";

type RegistrationMode = "existing" | "first-time";

export default function SenderRegisterPage() {
  const [mode, setMode] = useState<RegistrationMode | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [additionalPhones, setAdditionalPhones] = useState([""]);
  const [error, setError] = useState("");
  const [senderResult, setSenderResult] = useState<{
    senderPath: string;
    returning: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedPhone = normalizeNigerianPhone(phone);
    const normalizedAdditionalPhones =
      mode === "first-time"
        ? additionalPhones
            .map((additionalPhone) => additionalPhone.trim())
            .filter(Boolean)
            .map(normalizeNigerianPhone)
        : [];
    if (!isNigerianPhone(normalizedPhone)) {
      setError("Enter a complete Nigerian mobile number.");
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
    if (
      normalizedAdditionalPhones.length > 0 &&
      new Set([normalizedPhone, ...normalizedAdditionalPhones]).size !==
        normalizedAdditionalPhones.length + 1
    ) {
      setError(
        "Phone numbers must be unique. Please remove any duplicate numbers.",
      );
      return;
    }
    if (mode === "first-time" && !name.trim()) {
      setError("Enter your name or business name.");
      return;
    }
    if (!mode) return;

    setBusy(true);
    try {
      const sender =
        mode === "existing"
          ? await api.searchPublicSender(normalizedPhone)
          : await api.createSenderPublic({
              name: name.trim(),
              phone: normalizedPhone,
              whatsappPhone: normalizedPhone,
              additionalPhones: normalizedAdditionalPhones,
            });
      setSenderResult({
        senderPath: sender.senderPath,
        returning: mode === "existing",
      });
    } catch (registrationError) {
      setError(
        registrationError instanceof Error &&
          registrationError.message !== "REQUEST_FAILED"
          ? registrationError.message
          : mode === "existing"
            ? "We couldn’t find your sender account. Check the phone number or register as a first-time user."
            : "Registration could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (senderResult) {
    return (
      <main className="public-page sender-register-page">
        <div className="public-card sender-register-card sender-register-success">
          <CheckCircle2 size={36} color="#2d9862" aria-hidden="true" />
          <h1>{senderResult.returning ? "Welcome back" : "You’re registered"}</h1>
          <p>
            {senderResult.returning
              ? "Your sender account was found."
              : "Your sender account is ready."}
          </p>
          <Link
            className="button button-primary button-full"
            href={senderResult.senderPath}
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
          <h1>
            {mode === "existing"
              ? "Welcome back"
              : mode === "first-time"
                ? "Register as a sender"
                : "Sender access"}
          </h1>
          <p>
            {mode
              ? mode === "existing"
                ? "Enter the phone number linked to your sender account."
                : "Enter your name, phone number, and any optional additional numbers."
              : "Choose an option to continue."}
          </p>
        </header>
        {!mode ? (
          <div className="sender-register-choice-list">
            <button
              type="button"
              className="button button-primary button-full"
              onClick={() => setMode("existing")}
            >
              Already a user <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={() => setMode("first-time")}
            >
              First time as a user <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="back-link sender-register-back"
              disabled={busy}
              onClick={() => {
                setMode(null);
                setError("");
              }}
            >
              <ArrowLeft size={16} /> Choose another option
            </button>
            <form className="sender-register-form" onSubmit={submit}>
              {mode === "first-time" && (
                <div className="field">
                  <label htmlFor="sender-register-name">
                    Name or business name
                  </label>
                  <input
                    className="input"
                    id="sender-register-name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="sender-register-phone">Phone number</label>
                <input
                  className="input"
                  id="sender-register-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  placeholder="+234..."
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => setPhone(normalizeNigerianPhone(phone))}
                />
              </div>
              {mode === "first-time" && (
                <fieldset className="field sender-register-additional">
                  <legend>
                    Additional numbers <span>(optional)</span>
                  </legend>
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
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
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
              )}
              {error && <p className="form-error">{error}</p>}
              <button
                className="button button-primary button-full"
                disabled={busy}
              >
                {busy ? (
                  mode === "existing" ? "Checking..." : "Registering..."
                ) : (
                  <>
                    {mode === "existing" ? "Continue" : "Register"}{" "}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

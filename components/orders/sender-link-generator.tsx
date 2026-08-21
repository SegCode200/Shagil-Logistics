"use client";

import { Check, Clipboard, Link2, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const schema = z.object({
  senderName: z.string().trim().min(2, "Enter the sender or business name."),
  senderPhoneNumber: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,19}$/, "Enter a valid WhatsApp or phone number."),
});

type FormValues = z.infer<typeof schema>;

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message === "SESSION_EXPIRED") {
    return "Your session has expired. Please sign in again.";
  }
  return "We could not generate the sender link. Check the details and try again.";
}

export function SenderLinkGenerator() {
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { senderName: "", senderPhoneNumber: "" },
  });
  const mutation = useMutation({
    mutationFn: api.createSenderLink,
    onSuccess: ({ url }) => {
      setGeneratedUrl(url);
      setCopied(false);
      setToast("");
    },
  });

  async function copyLink() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setToast("Sender form link copied.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setToast("We could not copy the link. Please copy it manually.");
    }
  }

  function sendViaWhatsApp() {
    if (!generatedUrl) return;
    const phone = form.getValues("senderPhoneNumber").replace(/\D/g, "");
    const message = `Hello 👋\n\nPlease use the link below to provide your delivery details:\n\n${generatedUrl}\n\nThank you.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function reset() {
    setGeneratedUrl("");
    setCopied(false);
    setToast("");
    mutation.reset();
    form.reset();
  }

  return (
    <section className="panel sender-link-panel">
      <div className="panel-heading">
        <div>
          <h2>Create sender request</h2>
          <p className="panel-supporting-text">Generate a secure form link for a sender to complete their delivery details.</p>
        </div>
        <Link2 size={20} aria-hidden="true" />
      </div>
      <div className="panel-body">
        {!generatedUrl ? (
          <form className="sender-link-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="sender-link-name">Sender / business name</label>
                <input className="input" id="sender-link-name" autoComplete="organization" {...form.register("senderName")} />
                {form.formState.errors.senderName && <small>{form.formState.errors.senderName.message}</small>}
              </div>
              <div className="field">
                <label htmlFor="sender-link-phone">Sender WhatsApp / phone number</label>
                <input className="input" id="sender-link-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08012345678" {...form.register("senderPhoneNumber")} />
                {form.formState.errors.senderPhoneNumber && <small>{form.formState.errors.senderPhoneNumber.message}</small>}
              </div>
            </div>
            {mutation.isError && <p className="form-error" role="alert">{friendlyError(mutation.error)}</p>}
            <div className="form-actions sender-link-actions">
              <button className="button button-primary" disabled={mutation.isPending}>
                <Send size={17} /> {mutation.isPending ? "Generating link..." : "Generate form link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="sender-link-result" role="status" aria-live="polite">
            <div className="sender-link-success-heading"><span className="success-icon"><Check size={17} /></span><strong>Sender form link generated</strong></div>
            <div className="sender-link-url"><Link2 size={16} /><a href={generatedUrl} target="_blank" rel="noreferrer">{generatedUrl}</a></div>
            <div className="inline-actions">
              <button className="button button-secondary" onClick={copyLink}><Clipboard size={17} /> {copied ? "Copied" : "Copy link"}</button>
              <button className="button button-primary" onClick={sendViaWhatsApp}><MessageCircle size={17} /> Send via WhatsApp</button>
              <button className="button button-secondary" onClick={reset}><X size={17} /> New request</button>
            </div>
          </div>
        )}
        {toast && <p className="sender-link-toast" role="status">{toast}</p>}
      </div>
    </section>
  );
}

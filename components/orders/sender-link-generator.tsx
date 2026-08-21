"use client";

import { Check, Clipboard, Link2, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  const mutation = useMutation({
    mutationFn: api.createSenderLink,
    onSuccess: ({ path }) => {
      setGeneratedUrl(new URL(path, window.location.origin).toString());
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
    const message = `Hello 👋\n\nPlease use the link below to provide your delivery details:\n\n${generatedUrl}\n\nThank you.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function reset() {
    setGeneratedUrl("");
    setCopied(false);
    setToast("");
    mutation.reset();
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
          <div className="sender-link-form">
            <p className="subtext">Generate a secure form link, then forward it to any sender through WhatsApp or another channel.</p>
            {mutation.isError && <p className="form-error" role="alert">{friendlyError(mutation.error)}</p>}
            <div className="form-actions sender-link-actions">
              <button className="button button-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                <Send size={17} /> {mutation.isPending ? "Generating link..." : "Generate form link"}
              </button>
            </div>
          </div>
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

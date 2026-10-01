"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Download, Phone, Share2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function RiderAppPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [linkRequested, setLinkRequested] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const requestAccessLink = useMutation({
    mutationFn: (normalizedPhone: string) =>
      api.requestRiderAccessLink(normalizedPhone),
    onSuccess: () => {
      setError("");
      setLinkRequested(true);
    },
    onError: (requestError) => {
      setError(
        requestError instanceof Error && requestError.message !== "REQUEST_FAILED"
          ? requestError.message
          : "Could not request a rider access link. Please try again.",
      );
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(
        user.role === "OWNER"
          ? "/owner/dashboard"
          : user.role === "STATION_MANAGER"
            ? "/manager/dashboard"
            : "/rider/dashboard",
      );
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    });

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsStandalone(true);
    setInstallPrompt(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedPhone = normalizeNigerianPhone(phone);
    if (!isNigerianPhone(normalizedPhone)) {
      setError("Enter a complete Nigerian mobile number.");
      return;
    }
    requestAccessLink.mutate(normalizedPhone);
  }

  if (isLoading || user) return <LoadingState label="Opening rider app" />;

  return (
    <main className="rider-app-page">
      <header className="rider-app-header">
        <span className="brand-mark" aria-hidden="true">S</span>
        <div>
          <strong>Shagil</strong>
          <span>Rider app</span>
        </div>
      </header>
      <section className="rider-app-content">
        {linkRequested ? (
          <div className="rider-app-message">
            <CheckCircle2 size={38} />
            <p className="eyebrow">Access link requested</p>
            <h1>Check your WhatsApp</h1>
            <p>
              If this number is registered as a rider, the access link will be
              sent to its WhatsApp. Open the link once to connect this app.
            </p>
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={() => setLinkRequested(false)}
            >
              Use another number
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Rider access</p>
            <h1>Open your deliveries</h1>
            <p className="rider-app-intro">
              Enter the phone number registered to your rider account. Your
              access link will be sent to WhatsApp.
            </p>
            <form className="rider-app-form" onSubmit={submit}>
              <label htmlFor="rider-app-phone">Phone number</label>
              <div className="rider-app-phone-input">
                <Phone size={18} aria-hidden="true" />
                <input
                  className="input"
                  id="rider-app-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+2347042604550"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => setPhone(normalizeNigerianPhone(phone))}
                />
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button
                className="button button-primary button-full"
                disabled={requestAccessLink.isPending}
              >
                {requestAccessLink.isPending
                  ? "Requesting access..."
                  : <>Send access link <ArrowRight size={17} /></>}
              </button>
            </form>
          </>
        )}
      </section>
      {!isStandalone && (
        <aside className="rider-app-install">
          {installPrompt ? (
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={installApp}
            >
              <Download size={17} /> Install Shagil Rider
            </button>
          ) : isIos ? (
            <p><Share2 size={16} /> In Safari, use Share, then Add to Home Screen.</p>
          ) : (
            <p>Use your browser menu and choose Install app or Add to Home screen.</p>
          )}
        </aside>
      )}
    </main>
  );
}

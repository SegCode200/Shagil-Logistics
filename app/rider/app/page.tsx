"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, Phone, Share2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isNigerianPhone, normalizeNigerianPhone } from "@/lib/phone";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const PENDING_RIDER_ACCESS_LINK_KEY = "pending_rider_access_link";

export default function RiderAppPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [accessReady, setAccessReady] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  const requestAccessLink = useMutation({
    mutationFn: (normalizedPhone: string) =>
      api.requestRiderAccessLink(normalizedPhone),
    onSuccess: (result) => {
      if (!result.accessLink) {
        setError("No active rider was found for this company phone number.");
        return;
      }

      try {
        const accessUrl = new URL(result.accessLink, window.location.origin);
        if (!/^\/rider\/[^/]+\/?$/.test(accessUrl.pathname)) {
          setError("The rider access link returned by the server is invalid.");
          return;
        }
        localStorage.setItem(PENDING_RIDER_ACCESS_LINK_KEY, accessUrl.href);
        setAccessReady(true);
        setError("");
        if (window.matchMedia("(display-mode: standalone)").matches) {
          window.location.replace(accessUrl.href);
        }
      } catch {
        setError("The rider access link returned by the server is invalid.");
      }
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
    if (isLoading || user) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!isStandalone) return;
    const pendingAccessLink = localStorage.getItem(PENDING_RIDER_ACCESS_LINK_KEY);
    if (pendingAccessLink) window.location.replace(pendingAccessLink);
  }, [isLoading, user]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
      setAccessReady(Boolean(localStorage.getItem(PENDING_RIDER_ACCESS_LINK_KEY)));
    });

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => setAppInstalled(true);

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setAppInstalled(true);
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
    setAccessReady(false);
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
        <p className="eyebrow">Rider access</p>
        <h1>Open your deliveries</h1>
        {accessReady ? (
          <div className="rider-app-message" role="status">
            <p className="eyebrow">Access link saved</p>
            <h2>Install Shagil Rider</h2>
            <p>
              Install this app, then open it from your home screen. Your saved
              rider access link will open automatically.
            </p>
            {installPrompt && !appInstalled ? (
              <button
                type="button"
                className="button button-primary button-full"
                onClick={installApp}
              >
                <Download size={17} /> Install Shagil Rider
              </button>
            ) : appInstalled ? (
              <p className="rider-app-install-help">
                Shagil Rider is installed. Open it from your home screen to continue.
              </p>
            ) : isIos ? (
              <div className="rider-ios-install-help">
                <strong><Share2 size={17} /> Install on iPhone</strong>
                <ol>
                  <li>Open this page in Safari.</li>
                  <li>Tap the Share button.</li>
                  <li>Choose “Add to Home Screen,” then tap “Add.”</li>
                  <li>Open Shagil Rider from your home screen.</li>
                </ol>
              </div>
            ) : (
              <p className="rider-app-install-help">
                Use your browser menu to install or add this app to your home screen, then open it to continue.
              </p>
            )}
            <button
              type="button"
              className="button button-secondary button-full"
              onClick={() => {
                localStorage.removeItem(PENDING_RIDER_ACCESS_LINK_KEY);
                setAccessReady(false);
              }}
            >
              Use another number
            </button>
          </div>
        ) : (
          <>
            <p className="rider-app-intro">
              Enter the company phone number registered to your bike. We’ll
              save the rider access link first, then prepare it for the installed app.
            </p>
            <form className="rider-app-form" onSubmit={submit}>
              <label htmlFor="rider-app-phone">Company phone number</label>
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
                  : <>Get rider access <ArrowRight size={17} /></>}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

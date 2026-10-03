"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/primitives";
import type { Role } from "@/lib/types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const roleApps = {
  OWNER: {
    appName: "Shagil Owner",
    workspace: "Owner workspace",
    dashboard: "/owner/dashboard",
  },
  STATION_MANAGER: {
    appName: "Shagil Manager",
    workspace: "Station operations",
    dashboard: "/manager/dashboard",
  },
} satisfies Record<Exclude<Role, "RIDER">, {
  appName: string;
  workspace: string;
  dashboard: string;
}>;

function dashboardForRole(role: Role) {
  if (role === "OWNER") return roleApps.OWNER.dashboard;
  if (role === "STATION_MANAGER") return roleApps.STATION_MANAGER.dashboard;
  return "/rider/dashboard";
}

export function RoleInstallPage({ role }: { role: Exclude<Role, "RIDER"> }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const app = roleApps[role];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
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

  useEffect(() => {
    if (isLoading || !isStandalone) return;
    router.replace(user ? dashboardForRole(user.role) : "/login");
  }, [isLoading, isStandalone, router, user]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setAppInstalled(true);
    setInstallPrompt(null);
  }

  if (isLoading || isStandalone) {
    return <LoadingState label={`Opening ${app.appName}`} />;
  }

  return (
    <main className="role-install-page">
      <header className="role-install-header">
        <span className="brand-mark" aria-hidden="true">S</span>
        <div>
          <strong>Shagil</strong>
          <span>{app.workspace}</span>
        </div>
      </header>
      <section className="role-install-content">
        <p className="eyebrow">{app.workspace}</p>
        <h1>Install {app.appName}</h1>
        <p className="role-install-intro">
          Add the {app.workspace.toLowerCase()} to your phone for quick access. Sign in with your account to open the right workspace.
        </p>
        {installPrompt && !appInstalled ? (
          <button
            type="button"
            className="button button-primary button-full"
            onClick={installApp}
          >
            <Download size={17} /> Install {app.appName}
          </button>
        ) : appInstalled ? (
          <p className="role-install-help" role="status">
            {app.appName} is installed. Open it from your home screen.
          </p>
        ) : isIos ? (
          <div className="role-ios-install-help">
            <strong><Share2 size={17} /> Install on iPhone</strong>
            <ol>
              <li>Open this page in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Choose “Add to Home Screen,” then tap “Add.”</li>
            </ol>
          </div>
        ) : (
          <p className="role-install-help">
            Use your browser menu to install or add {app.appName} to your home screen.
          </p>
        )}
        <div className="role-install-actions">
          <Link className="button button-secondary button-full" href="/login">
            Sign in to Shagil
          </Link>
          {user && (
            <Link className="text-link" href={dashboardForRole(user.role)}>
              Continue to {user.role === "OWNER" ? "owner" : user.role === "STATION_MANAGER" ? "station manager" : "rider"} workspace
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
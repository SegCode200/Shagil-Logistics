"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  Truck,
  Users,
  X,
  MapPinned,
  Flag,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const ownerLinks = [
  { href: "/owner/dashboard", label: "Dashboard", icon: Home },
  { href: "/owner/orders", label: "Orders", icon: Package },
  { href: "/owner/profile", label: "Profile", icon: Settings },
  { href: "/create-order", label: "Create order", icon: Plus },
  { href: "/owner/riders", label: "Riders", icon: Users },
  { href: "/owner/zones", label: "Delivery zones", icon: MapPinned },
  { href: "/owner/rider-reports", label: "Rider reports", icon: Flag },
];
const riderLinks = [
  { href: "/rider/dashboard", label: "My deliveries", icon: Truck },
  { href: "/rider/profile", label: "Profile", icon: Settings },
];

export function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "OWNER" | "RIDER";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = role === "OWNER" ? ownerLinks : riderLinks;
  async function signOut() {
    await logout();
    router.replace("/login");
  }
  return (
    <div className={`app-frame ${role === "RIDER" ? "rider-frame" : ""}`}>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">S</span>
          <span>Shagil</span>
          {open && (
            <button
              className="icon-button mobile-only"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="workspace-label">{role === "OWNER" ? "Workspace" : "Delivery mode"}</div>
        <nav className="primary-nav">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-section-label">Account</span>
          <div className="user-mini">
            <span className="avatar">
              {user?.name?.slice(0, 1).toUpperCase() || "U"}
            </span>
            <span>
              <strong>{user?.name || "Account"}</strong>
              <small>{role === "OWNER" ? "Owner" : "Rider"}</small>
            </span>
          </div>
          <button className="nav-link logout" onClick={signOut}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="main-content">
        <header className="mobile-header">
          <button
            className="icon-button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Link
            href={role === "OWNER" ? "/owner/dashboard" : "/rider/dashboard"}
            className="brand"
          >
            <span className="brand-mark">S</span>
            <span>Shagil</span>
          </Link>
          <span className="header-role">
            {role === "OWNER" ? "Owner" : "Rider"}
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}

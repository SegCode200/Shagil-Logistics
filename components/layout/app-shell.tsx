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
  Building2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

const ownerLinks = [
  { href: "/owner/dashboard", label: "Dashboard", icon: Home },
  { href: "/owner/orders", label: "Orders", icon: Package },
  { href: "/owner/profile", label: "Profile", icon: Settings },
  { href: "/create-order", label: "Create order", icon: Plus },
  { href: "/owner/bike", label: "Bike", icon: Truck },
  { href: "/owner/riders", label: "Riders", icon: Users },
  { href: "/owner/zones", label: "Delivery zones", icon: MapPinned },
  { href: "/owner/rider-reports", label: "Rider reports", icon: Flag },
  { href: "/owner/link-customer", label: "Link customer", icon: Plus },
  { href: "/owner/stations", label: "Stations", icon: Building2 },
  { href: "/owner/users", label: "Station Manager", icon: Users },
];
const riderLinks = [
  { href: "/rider/dashboard", label: "My deliveries", icon: Truck },
  { href: "/rider/profile", label: "Profile", icon: Settings }

];
const managerLinks = [
  { href: "/manager/dashboard", label: "Dashboard", icon: Home },
  { href: "/manager/orders", label: "Orders", icon: Package },
  {href: "/manager/riders", label: "Riders", icon: Users  },
  {href: "/manager/link-customer", label: "Link customer", icon: Plus  }
];


export function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "OWNER" | "STATION_MANAGER" | "RIDER";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = role === "OWNER" ? ownerLinks : role === "STATION_MANAGER" ? managerLinks : riderLinks;
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
        <div className="workspace-label">{role === "OWNER" ? "Workspace" : role === "STATION_MANAGER" ? "Station operations" : "Delivery mode"}</div>
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
              <small>{role === "OWNER" ? "Owner" : role === "STATION_MANAGER" ? "Station manager" : "Rider"}</small>
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
            href={role === "OWNER" ? "/owner/dashboard" : role === "STATION_MANAGER" ? "/manager/dashboard" : "/rider/dashboard"}
            className="brand"
          >
            <span className="brand-mark">S</span>
            <span>Shagil</span>
          </Link>
          <span className="header-role">
            {role === "OWNER" ? "Owner" : role === "STATION_MANAGER" ? "Manager" : "Rider"}
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}

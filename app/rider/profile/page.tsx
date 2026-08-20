"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth, useRoleRedirect } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/primitives";

export default function RiderProfile() { const { user, isLoading } = useRoleRedirect("RIDER"); const { logout } = useAuth(); const router = useRouter(); if (isLoading || !user) return <LoadingState />; async function signOut() { await logout(); router.replace("/login"); } return <AppShell role="RIDER"><div className="page"><header className="page-header"><div><p className="eyebrow">Your account</p><h1>Profile</h1><p className="subtext">Your Shagil rider details.</p></div></header><section className="panel detail-card profile-card"><div className="profile-hero"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><h2>{user.name}</h2><p>Rider account</p></div></div><dl className="detail-list"><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Phone</dt><dd>{user.phone || "—"}</dd></div><div><dt>Email</dt><dd>{user.email || "—"}</dd></div><div><dt>Role</dt><dd>Rider</dd></div></dl><button className="button button-danger button-full profile-logout" onClick={signOut}>Log out</button></section></div></AppShell>; }

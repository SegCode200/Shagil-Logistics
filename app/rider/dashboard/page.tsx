"use client";

import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState, OrderStatusBadge } from "@/components/ui/primitives";

export default function RiderDashboard() { const { user, isLoading: authLoading } = useRoleRedirect("RIDER"); const query = useQuery({ queryKey: ["rider-orders"], queryFn: api.getRiderOrders, enabled: Boolean(user) }); if (authLoading || !user) return <LoadingState />; const orders = query.data || []; return <AppShell role="RIDER"><div className="page"><header className="page-header"><div><p className="eyebrow">Your route</p><h1>My deliveries</h1><p className="subtext">Keep it simple. One delivery at a time.</p></div></header>{query.isLoading ? <LoadingState label="Loading deliveries" /> : query.isError ? <ErrorState /> : orders.length === 0 ? <EmptyState title="No deliveries assigned to you" description="New deliveries will appear here when they are ready." /> : <div className="delivery-list">{orders.map(order => <article className="panel rider-delivery-card" key={order.id}><header className="card-row"><div><h3>{order.customerName}</h3><p className="order-ref">{order.orderId || order.id}</p></div><OrderStatusBadge status={order.status} /></header><p className="address"><MapPin size={15} /> {order.deliveryAddress}</p>{order.status !== "DELIVERED" && order.status !== "CANCELLED" && <Link href={`/rider/deliveries/${order.id}/confirm`} className="button button-primary button-full">Confirm delivery <ArrowRight size={17} /></Link>}</article>)}</div>}</div></AppShell>; }

"use client";

import Link from "next/link";
import { ArrowUpRight, Bike, Phone, Star, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/primitives";

export default function ManagerRidersPage() {
  const { user, isLoading } = useRoleRedirect("STATION_MANAGER");
  const riders = useQuery({
    queryKey: ["stationRiders"],
    queryFn: api.getStationRiders,
    enabled: Boolean(user),
  });
  const orders = useQuery({
    queryKey: ["managerOrders"],
    queryFn: api.getManagerOrders,
    enabled: Boolean(user),
});

  if (isLoading || !user) return <LoadingState />;
  const items = riders.data || [];
  return (
    <AppShell role="STATION_MANAGER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Station operations</p>
            <h1>Riders</h1>
            <p className="subtext">
              Riders assigned to company bikes in your station.
            </p>
          </div>
        </header>
        <section className="panel">
          <div className="panel-heading">
            <h2>Company bike riders</h2>
          </div>
          {riders.isLoading || orders.isLoading ? (
            <LoadingState label="Loading company-bike riders" />
          ) : riders.isError || orders.isError ? (
            <ErrorState message="Unable to load riders for your stations." />
          ) : items.length === 0 ? (
            <EmptyState
              title="No riders found."
              description="Riders assigned to your stations will appear here."
            />
          ) : (
            <div className="manager-rider-grid">
              {items.map((rider) => {
                const zoneNames = rider.riderZones?.map((zone) => zone.name) || [];
                const today = new Date();
                const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const assignedOrders =
                  orders.data?.filter(
                    (order) =>
                      (order.assignedRider?.id || order.rider?.id) === rider.id,
                  ).length ||
                  rider.assignedOrders ||
                  0;
                const todayDeliveries = orders.data?.filter((order) => {
                  const assignedRiderId = order.assignedRider?.id || order.rider?.id;
                  return assignedRiderId === rider.id && order.createdAt.slice(0, 10) === todayKey;
                }).length || 0;
                return (
                  <article className="panel manager-rider-card" key={rider.id}>
                    <header className="card-row">
                      <div className="manager-rider-name">
                        <span className="avatar">
                          {rider.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <h3>
                            {rider.name}
                            <span className="rider-today-deliveries">{todayDeliveries} today</span>
                          </h3>
                          <p>
                            <Phone size={13} /> {rider.phone || "No phone"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          rider.active === false ? "inactive-dot" : "active-dot"
                        }
                      >
                        {rider.active === false ? "Inactive" : "Available"}
                      </span>
                    </header>
                    <div className="manager-rider-facts">
                      <span>
                        <Bike size={14} />
                        <strong>Company bike</strong>
                        {rider.companyBikeId || rider.bikeId || "Assigned bike"}
                      </span>
                      <span>
                        <Star size={14} />
                        <strong>Rating</strong>
                        {rider.ratingsReceived && rider.ratingsReceived.length > 0 ? (
                          <span>
                            {(
                              rider.ratingsReceived.reduce((sum, rating) => sum + rating.rating, 0) /
                              rider.ratingsReceived.length
                            ).toFixed(1)} rating
                          </span>
                        ) : (
                          "No rating"
                        )}
                      </span>
                      <span>
                        <Users size={14} />
                        <strong>Assigned orders</strong>
                        <Link
                          href={`/manager/orders?riderId=${encodeURIComponent(rider.id)}`}
                        >
                          {assignedOrders} <ArrowUpRight size={13} />
                        </Link>
                      </span>
                    </div>
                    {zoneNames.length > 0 && (
                      <p className="manager-rider-zones">
                        <strong>Zones:</strong> {zoneNames.join(", ")}
                      </p>
                    )}
                    <Link
                      className="button button-secondary button-full"
                      href={`/manager/orders?riderId=${encodeURIComponent(rider.id)}`}
                    >
                      View rider orders <ArrowUpRight size={15} />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

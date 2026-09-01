"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import {
  useForm,
  useWatch,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { FocusEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { normalizeNigerianPhone } from "@/lib/phone";
import { LoadingState } from "@/components/ui/primitives";

const schema = z.object({
  senderName: z.string().min(2),
  senderPhone: z.string().min(7),
  receiverName: z.string().min(2),
  receiverPhone: z.string().min(7),
  notes: z.string().optional(),
  pickupMethod: z.enum(["SENDER_DROPOFF", "RIDER_PICKUP"]),
  pickupAddress: z.string().optional(),
  pickupInstructions: z.string().optional(),
  deliveryAddress: z.string().min(5),
  stationId: z.string().min(1),
  deliveryZoneId: z.string().min(1),
  paymentMethod: z.enum(["ALREADY_PAID", "PAYMENT_ON_DELIVERY"]),
  assignedRiderId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewOrderPage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: api.getRiders,
    enabled: Boolean(user),
  });
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
    enabled: Boolean(user),
  });
  const stations = useQuery({
    queryKey: ["stations"],
    queryFn: api.getStations,
    enabled: Boolean(user),
  });
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<Awaited<
    ReturnType<typeof api.createOrder>
  > | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      pickupMethod: "SENDER_DROPOFF",
      paymentMethod: "PAYMENT_ON_DELIVERY",
    },
  });
  const pickupMethod = useWatch({
    control: form.control,
    name: "pickupMethod",
  });
  const paymentMethod = useWatch({
    control: form.control,
    name: "paymentMethod",
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.createOrder(values),
    onSuccess: (order) => {
      setCreated(order);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  if (isLoading || !user) return <LoadingState />;
  if (created)
    return (
      <AppShell role="OWNER">
        <div className="page">
          <Link href="/owner/orders" className="back-link">
            <ArrowLeft size={16} /> Back to orders
          </Link>
          <div className="success-card">
            <CheckCircle2 size={35} color="#2d9862" />
            <h2>Order created successfully</h2>
            <p className="subtext">
              The backend generated the customer-facing details.
            </p>
            <div className="code-box">
              <span>Order ID</span>
              <strong>{created.orderId || created.id}</strong>
            </div>
            {created.deliveryCode && (
              <div className="code-box">
                <span>Delivery code</span>
                <strong>{created.deliveryCode}</strong>
              </div>
            )}
            <Link
              className="button button-primary"
              href={`/owner/orders/${created.orderId}`}
            >
              View order
            </Link>
          </div>
        </div>
      </AppShell>
    );
  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">New order</p>
            <h1>Create an order</h1>
            <p className="subtext">
              Payment totals and delivery fees are calculated by the backend.
            </p>
          </div>
        </header>
        <section className="panel">
          <form
            className="panel-body"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="form-grid">
              <h2 className="field-span form-section-title">Sender</h2>
              <Field
                form={form}
                name="senderName"
                label="Sender / business name"
              />
              <Field
                form={form}
                name="senderPhone"
                label="Sender phone number"
                type="tel"
                placeholder="+2347042604550"
                onBlur={(event) => form.setValue("senderPhone", normalizeNigerianPhone(event.target.value))}
              />
              <h2 className="field-span form-section-title">Receiver</h2>
              <Field form={form} name="receiverName" label="Receiver name" />
              <Field
                form={form}
                name="receiverPhone"
                label="Receiver phone number"
                type="tel"
                placeholder="+2347042604550"
                onBlur={(event) => form.setValue("receiverPhone", normalizeNigerianPhone(event.target.value))}
              />
              <h2 className="field-span form-section-title">Package</h2>
              <Field form={form} name="notes" label="Notes" />
              <h2 className="field-span form-section-title">Pickup</h2>
              <div className="field">
                <label htmlFor="pickupMethod">Pickup method</label>
                <select
                  className="select"
                  id="pickupMethod"
                  {...form.register("pickupMethod")}
                >
                  <option value="SENDER_DROPOFF">
                    Sender will bring package to office
                  </option>
                  <option value="RIDER_PICKUP">
                    Rider will pick up from sender
                  </option>
                </select>
              </div>
              {pickupMethod === "RIDER_PICKUP" && (
                <>
                  <Field
                    form={form}
                    name="pickupAddress"
                    label="Pickup address"
                  />
                  <Field
                    form={form}
                    name="pickupInstructions"
                    label="Pickup instructions"
                  />
                </>
              )}
              <h2 className="field-span form-section-title">Delivery</h2>
              <Field
                form={form}
                name="deliveryAddress"
                label="Delivery address"
              />
              <div className="field">
                <label htmlFor="stationId">Station</label>
                <select className="select" id="stationId" {...form.register("stationId")}>
                  <option value="">Select a station</option>
                  {(stations.data || []).map((station) => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </select>
                {form.formState.errors.stationId && (
                  <small>{String(form.formState.errors.stationId.message || "Select a station")}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="deliveryZoneId">Area</label>
                <select
                  className="select"
                  id="deliveryZoneId"
                  {...form.register("deliveryZoneId")}
                >
                  <option value="">Select a zone</option>
                  {(zones.data || [])
                    .filter((zone) => zone.active)
                    .map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} · ₦{Number(zone.fee).toLocaleString()}
                      </option>
                    ))}
                </select>
                {form.formState.errors.deliveryZoneId && (
                  <small>{String(form.formState.errors.deliveryZoneId.message || "Select a zone")}</small>
                )}
              </div>
              <h2 className="field-span form-section-title">Payment</h2>
              <div className="field">
                <label htmlFor="paymentMethod">Payment method</label>
                <select
                  className="select"
                  id="paymentMethod"
                  {...form.register("paymentMethod")}
                >
                  <option value="ALREADY_PAID">Payment after delivery</option>
                  <option value="PAYMENT_ON_DELIVERY">
                    Payment on delivery
                  </option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="assignedRiderId">
                  Assign rider <span className="muted">(optional)</span>
                </label>
                <select
                  className="select"
                  id="assignedRiderId"
                  {...form.register("assignedRiderId")}
                >
                  <option value="">Unassigned</option>
                  {(riders.data || [])
                    .filter((rider) => rider.active !== false)
                    .map((rider) => (
                      <option key={rider.id} value={rider.id}>
                        {rider.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {mutation.isError && (
              <p className="form-error">
                Order could not be created. Check the details and try again.
              </p>
            )}
            <div className="form-actions">
              <Link className="button button-secondary" href="/owner/orders">
                Cancel
              </Link>
              <button
                className="button button-primary"
                disabled={mutation.isPending}
              >
                <Plus size={17} />{" "}
                {mutation.isPending ? "Creating..." : "Create order"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
function Field({
  form,
  name,
  label,
  type = "text",
  placeholder,
  onBlur,
}: {
  form: UseFormReturn<FormValues>;
  name: keyof FormValues;
  label: string;
  type?: string;
  placeholder?: string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={String(name)}>{label}</label>
      <input
        className="input"
        id={String(name)}
        type={type}
        placeholder={placeholder}
        {...form.register(name)}
        onBlur={onBlur}
      />
      {form.formState.errors[name] && (
        <small>
          {String(form.formState.errors[name]?.message || "Required")}
        </small>
      )}
    </div>
  );
}

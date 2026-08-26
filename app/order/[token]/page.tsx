"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { use, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { OrderStatusBadge } from "@/components/ui/primitives";
import { normalizeNigerianPhone } from "@/lib/phone";

type Props = { params: Promise<{ token: string }> };
export default function PublicOrderPage({ params }: Props) {
  const { token } = use(params);
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
  });
  const stations = useQuery({
    queryKey: ["public-stations"],
    queryFn: api.getPublicStations,
  });
  const [values, setValues] = useState({
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    stationId: "",
    pickupMethod: "SENDER_DROP_OFF",
    pickupAddress: "",
    pickupInstructions: "",
    deliveryAddress: "",
    deliveryZoneId: "",
    paymentMethod: "PAYMENT_ON_DELIVERY",
    orderAmount: "",
    notes: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      api.createPublicOrder(token, {
        ...values,
        senderPhone: normalizeNigerianPhone(values.senderPhone),
        receiverPhone: normalizeNigerianPhone(values.receiverPhone),
        orderAmount: values.orderAmount
          ? Number(values.orderAmount)
          : undefined,
      }),
  });
  const set = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  if (mutation.data)
    return (
      <main className="public-page">
        <div className="public-card success-card">
          <CheckCircle2 size={40} color="#2d9862" />
          <h1>Delivery request received</h1>
          <p className="subtext">Keep these details for your records.</p>
          <div className="code-box">
            <span>Order ID</span>
            <strong>
              {mutation.data.orderId ||
                "Available in your confirmation message"}
            </strong>
          </div>
          <OrderStatusBadge status={mutation.data.status} />
          <p className="subtext">
            We will review the request and share next steps shortly.
          </p>
        </div>
      </main>
    );
  return (
    <main className="public-page">
      <div className="public-card">
        <header className="public-header">
          <p className="eyebrow">Shagil delivery</p>
          <h1>Create Your Delivery</h1>
          <p className="subtext">
            Tell us where the package should go. No account needed.
          </p>
        </header>
        <form
          className="public-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <fieldset>
            <legend>1. Sender information</legend>
            <div className="form-grid">
              <Field
                label="Sender / business name"
                value={values.senderName}
                onChange={(v) => set("senderName", v)}
              />
              <Field
                label="Sender phone number"
                type="tel"
                value={values.senderPhone}
                onChange={(v) => set("senderPhone", v)}
                onBlur={() => set("senderPhone", normalizeNigerianPhone(values.senderPhone))}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>2. Receiver information</legend>
            <div className="form-grid">
              <Field
                label="Receiver name"
                value={values.receiverName}
                onChange={(v) => set("receiverName", v)}
              />
              <Field
                label="Receiver phone number"
                type="tel"
                value={values.receiverPhone}
                onChange={(v) => set("receiverPhone", v)}
                onBlur={() => set("receiverPhone", normalizeNigerianPhone(values.receiverPhone))}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>3. Package information</legend>
            <div className="form-grid">
              <Field
                label="Notes"
                value={values.notes}
                onChange={(v) => set("notes", v)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>4. Pickup information</legend>
            <select
              className="select"
              value={values.pickupMethod}
              onChange={(e) => set("pickupMethod", e.target.value)}
            >
              <option value="SENDER_DROP_OFF">
                I will bring the package to the office
              </option>
              <option value="RIDER_PICKUP">Rider will pick up from me</option>
            </select>
            {values.pickupMethod === "RIDER_PICKUP" && (
              <div className="form-grid public-followup">
                <Field
                  label="Pickup address"
                  value={values.pickupAddress}
                  onChange={(v) => set("pickupAddress", v)}
                />
                <Field
                  label="Pickup instructions"
                  value={values.pickupInstructions}
                  onChange={(v) => set("pickupInstructions", v)}
                />
              </div>
            )}{" "}
          </fieldset>
          <fieldset>
            <legend>5. Delivery information</legend>
            <div className="form-grid">
              <Field
                label="Delivery address"
                value={values.deliveryAddress}
                onChange={(v) => set("deliveryAddress", v)}
              />
              <div className="field">
                <label htmlFor="public-station">Station</label>
                <select
                  className="select"
                  id="public-station"
                  required
                  value={values.stationId}
                  onChange={(event) => set("stationId", event.target.value)}
                >
                  <option value="">Select a station</option>
                  {(stations.data || []).map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="public-area">Area</label>
                <select
                  className="select"
                  id="public-area"
                  required
                  value={values.deliveryZoneId}
                  onChange={(event) => set("deliveryZoneId", event.target.value)}
                >
                  <option value="">Select an area</option>
                  {(zones.data || [])
                    .filter((zone) => zone.active)
                    .map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} · ₦{Number(zone.fee).toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>6. Payment</legend>
            <select
              className="select"
              value={values.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value)}
            >
              <option value="PAYMENT_ON_DELIVERY">Payment on delivery</option>
              <option value="ALREADY_PAID">Already paid</option>
            </select>
            {values.paymentMethod === "PAYMENT_ON_DELIVERY" && (
              <Field
                label="Order amount"
                type="number"
                value={values.orderAmount}
                onChange={(v) => set("orderAmount", v)}
              />
            )}
          </fieldset>
          {mutation.isError && (
            <p className="form-error">
              We could not submit this request. The link may be invalid or
              expired, or the details may need attention.
            </p>
          )}
          <button
            className="button button-primary button-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              "Submitting..."
            ) : (
              <>
                Submit delivery request <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <p className="public-foot">
          <Link href="/login">Staff sign in</Link>
        </p>
      </div>
    </main>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  onBlur?: () => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input"
        required={label !== "Notes" && label !== "Pickup instructions"}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

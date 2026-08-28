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
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
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
    deliveryType: "NORMAL",
    orderAmount: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedDistance = stations.data
    ?.find((station) => station.id === values.stationId)
    ?.zoneDistances?.find((distance) => distance.deliveryZoneId === values.deliveryZoneId);
  const deliveryFee = selectedDistance
    ? Number(settings.data?.fixedDeliveryRate || 0) +
      Number(settings.data?.variableDeliveryRate || 0) * Number(selectedDistance.distanceKm)
    : undefined;
  const mutation = useMutation({
    mutationFn: () =>
      api.createPublicOrder(token, {
        ...values,
        senderPhone: normalizeNigerianPhone(values.senderPhone),
        receiverPhone: normalizeNigerianPhone(values.receiverPhone),
        orderAmount: values.orderAmount
          ? Number(values.orderAmount)
          : undefined,
        deliveryFee,
      }),
  });
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredFields: [keyof typeof values, string][] = [
      ["senderName", "Enter the sender or business name."],
      ["senderPhone", "Enter the sender phone number."],
      ["receiverName", "Enter the receiver name."],
      ["receiverPhone", "Enter the receiver phone number."],
      ["pickupAddress", "Enter the sender pickup address."],
      ["deliveryAddress", "Enter the delivery address."],
      ["stationId", "Select a station."],
      ["deliveryZoneId", "Select a delivery area."],
      ["orderAmount", "Enter the value of the product."],
    ];
    const nextErrors: Record<string, string> = {};
    requiredFields.forEach(([key, message]) => {
      if (typeof values[key] === "string" && !values[key].trim()) nextErrors[key] = message;
    });
    if (values.senderPhone.trim().length < 7) nextErrors.senderPhone = "Enter a valid sender phone number.";
    if (values.receiverPhone.trim().length < 7) nextErrors.receiverPhone = "Enter a valid receiver phone number.";
    if (deliveryFee == null) nextErrors.deliveryZoneId = "Select an area with a configured station distance.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) mutation.mutate();
  }
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
        <form className="public-form" noValidate onSubmit={submitOrder}>
          <fieldset>
            <legend>1. Sender information</legend>
            <div className="form-grid">
              <Field
                label="Sender / business name"
                value={values.senderName}
                onChange={(v) => set("senderName", v)}
                error={errors.senderName}
              />
              <Field
                label="Sender phone number"
                type="tel"
                value={values.senderPhone}
                onChange={(v) => set("senderPhone", v)}
                onBlur={() => set("senderPhone", normalizeNigerianPhone(values.senderPhone))}
                error={errors.senderPhone}
              />
              <Field
                label="Sender address / pickup address"
                value={values.pickupAddress}
                onChange={(v) => set("pickupAddress", v)}
                error={errors.pickupAddress}
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
                error={errors.receiverName}
              />
              <Field
                label="Receiver phone number"
                type="tel"
                value={values.receiverPhone}
                onChange={(v) => set("receiverPhone", v)}
                onBlur={() => set("receiverPhone", normalizeNigerianPhone(values.receiverPhone))}
                error={errors.receiverPhone}
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
                error={errors.deliveryAddress}
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
                {errors.stationId && <small>{errors.stationId}</small>}
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
                        {zone.name}
                      </option>
                    ))}
                </select>
                {errors.deliveryZoneId && <small>{errors.deliveryZoneId}</small>}
              </div>
              <div className="field">
                <span className="field-label">Delivery fee</span>
                <div className="delivery-fee-card" aria-live="polite">
                  <div>
                    <span className="delivery-fee-caption">Calculated fee</span>
                    <strong>
                      {deliveryFee == null
                        ? "Select station and area"
                        : `₦${deliveryFee.toLocaleString()}`}
                    </strong>
                  </div>
                  <span className="delivery-fee-zone">
                    {selectedDistance
                      ? `${selectedDistance.distanceKm} km`
                      : "Distance will appear here"}
                  </span>
                </div>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>5. Delivery type</legend>
            <label htmlFor="public-delivery-type">Delivery type</label>
            <select
              className="select"
              id="public-delivery-type"
              required
              value={values.deliveryType}
              onChange={(event) =>
                set("deliveryType", event.target.value as "NORMAL" | "EXPRESS")
              }
            >
              <option value="NORMAL">Normal delivery</option>
              <option value="EXPRESS">Express/Charter delivery</option>
            </select>
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
            <Field
              label="Value of product"
              type="number"
              required
              value={values.orderAmount}
              onChange={(v) => set("orderAmount", v)}
              error={errors.orderAmount}
            />
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
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input"
        required={required || (label !== "Notes" && label !== "Pickup instructions")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error && <small>{error}</small>}
    </div>
  );
}

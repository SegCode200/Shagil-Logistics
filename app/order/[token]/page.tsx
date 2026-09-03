// "use client";

// import Link from "next/link";
// import { CheckCircle2, ArrowRight } from "lucide-react";
// import { use, useState } from "react";
// import { useMutation, useQuery } from "@tanstack/react-query";
// import { api } from "@/lib/api";
// import { OrderStatusBadge } from "@/components/ui/primitives";
// import { normalizeNigerianPhone } from "@/lib/phone";

// type Props = { params: Promise<{ token: string }> };
// export default function PublicOrderPage({ params }: Props) {
//   const { token } = use(params);
//   const zones = useQuery({
//     queryKey: ["delivery-zones"],
//     queryFn: api.getDeliveryZones,
//   });
//   const stations = useQuery({
//     queryKey: ["public-stations"],
//     queryFn: api.getPublicStations,
//   });
//   const settings = useQuery({
//     queryKey: ["company-settings"],
//     queryFn: api.getSettings,
//   });
//   const [values, setValues] = useState({
//     senderName: "",
//     senderPhone: "",
//     receiverName: "",
//     receiverPhone: "",
//     stationId: "",
//     pickupMethod: "SENDER_DROP_OFF",
//     pickupAddress: "",
//     pickupInstructions: "",
//     deliveryAddress: "",
//     deliveryZoneId: "",
//     paymentMethod: "PAYMENT_ON_DELIVERY",
//     deliveryType: "NORMAL",
//     notes: "",
//   });
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const selectedDistance = stations.data
//     ?.find((station) => station.id === values.stationId)
//     ?.zoneDistances?.find((distance) => distance.deliveryZoneId === values.deliveryZoneId);
//   const deliveryFee = selectedDistance
//     ? Number(settings.data?.fixedDeliveryRate || 0) +
//       Number(settings.data?.variableDeliveryRate || 0) * Number(selectedDistance.distanceKm)
//     : undefined;
//   const mutation = useMutation({
//     mutationFn: () =>
//       api.createPublicOrder(token, {
//         ...values,
//         senderPhone: normalizeNigerianPhone(values.senderPhone),
//         receiverPhone: normalizeNigerianPhone(values.receiverPhone),
//         deliveryFee,
//       }),
//   });
//   const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
//     setValues((current) => ({ ...current, [key]: value }));
//     setErrors((current) => {
//       const next = { ...current };
//       delete next[key];
//       return next;
//     });
//   };
//   function submitOrder(event: React.FormEvent<HTMLFormElement>) {
//     event.preventDefault();
//     const requiredFields: [keyof typeof values, string][] = [
//       ["senderName", "Enter the sender or business name."],
//       ["senderPhone", "Enter the sender phone number."],
//       ["receiverName", "Enter the receiver name."],
//       ["receiverPhone", "Enter the receiver phone number."],
//       ["pickupAddress", "Enter the sender pickup address."],
//       ["deliveryAddress", "Enter the delivery address."],
//       ["stationId", "Select a station."],
//       ["deliveryZoneId", "Select a delivery area."],
//     ];
//     const nextErrors: Record<string, string> = {};
//     requiredFields.forEach(([key, message]) => {
//       if (typeof values[key] === "string" && !values[key].trim()) nextErrors[key] = message;
//     });
//     if (values.senderPhone.trim().length < 7) nextErrors.senderPhone = "Enter a valid sender phone number.";
//     if (values.receiverPhone.trim().length < 7) nextErrors.receiverPhone = "Enter a valid receiver phone number.";
//     if (deliveryFee == null) nextErrors.deliveryZoneId = "Select an area with a configured station distance.";
//     setErrors(nextErrors);
//     if (Object.keys(nextErrors).length === 0) mutation.mutate();
//   }
//   if (mutation.data)
//     return (
//       <main className="public-page">
//         <div className="public-card success-card">
//           <CheckCircle2 size={40} color="#2d9862" />
//           <h1>Delivery request received</h1>
//           <p className="subtext">Keep these details for your records.</p>
//           <div className="code-box">
//             <span>Order ID</span>
//             <strong>
//               {mutation.data.orderId ||
//                 "Available in your confirmation message"}
//             </strong>
//           </div>
//           <OrderStatusBadge status={mutation.data.status} />
//           <p className="subtext">
//             We will review the request and share next steps shortly.
//           </p>
//         </div>
//       </main>
//     );
//   return (
//     <main className="public-page">
//       <div className="public-card">
//         <header className="public-header">
//           <p className="eyebrow">Shagil delivery</p>
//           <h1>Create Your Delivery</h1>
//           <p className="subtext">
//             Tell us where the package should go. No account needed.
//           </p>
//         </header>
//         <form className="public-form" noValidate onSubmit={submitOrder}>
//           <fieldset>
//             <legend>1. Sender information</legend>
//             <div className="form-grid">
//               <Field
//                 label="Sender / business name"
//                 value={values.senderName}
//                 onChange={(v) => set("senderName", v)}
//                 error={errors.senderName}
//               />
//               <Field
//                 label="Sender phone number"
//                 type="tel"
//                 value={values.senderPhone}
//                 onChange={(v) => set("senderPhone", v)}
//                 onBlur={() => set("senderPhone", normalizeNigerianPhone(values.senderPhone))}
//                 error={errors.senderPhone}
//               />
//               <Field
//                 label="Sender address / pickup address"
//                 value={values.pickupAddress}
//                 onChange={(v) => set("pickupAddress", v)}
//                 error={errors.pickupAddress}
//               />
//             </div>
//           </fieldset>
//           <fieldset>
//             <legend>2. Receiver information</legend>
//             <div className="form-grid">
//               <Field
//                 label="Receiver name"
//                 value={values.receiverName}
//                 onChange={(v) => set("receiverName", v)}
//                 error={errors.receiverName}
//               />
//               <Field
//                 label="Receiver phone number"
//                 type="tel"
//                 value={values.receiverPhone}
//                 onChange={(v) => set("receiverPhone", v)}
//                 onBlur={() => set("receiverPhone", normalizeNigerianPhone(values.receiverPhone))}
//                 error={errors.receiverPhone}
//               />
//             </div>
//           </fieldset>
//           <fieldset>
//             <legend>4. Pickup information</legend>
//             <select
//               className="select"
//               value={values.pickupMethod}
//               onChange={(e) => set("pickupMethod", e.target.value)}
//             >
//               <option value="SENDER_DROP_OFF">
//                 I will bring the package to the office
//               </option>
//               <option value="RIDER_PICKUP">Rider will pick up from me</option>
//             </select>
//             {values.pickupMethod === "RIDER_PICKUP" && (
//               <div className="form-grid public-followup">
//                 <Field
//                   label="Pickup address"
//                   value={values.pickupAddress}
//                   onChange={(v) => set("pickupAddress", v)}
//                 />
//                 <Field
//                   label="Pickup instructions"
//                   value={values.pickupInstructions}
//                   onChange={(v) => set("pickupInstructions", v)}
//                 />
//               </div>
//             )}{" "}
//           </fieldset>
//           <fieldset>
//             <legend>5. Delivery information</legend>
//             <div className="form-grid">
//               <Field
//                 label="Delivery address"
//                 value={values.deliveryAddress}
//                 onChange={(v) => set("deliveryAddress", v)}
//                 error={errors.deliveryAddress}
//               />
//               <div className="field">
//                 <label htmlFor="public-station">Station</label>
//                 <select
//                   className="select"
//                   id="public-station"
//                   required
//                   value={values.stationId}
//                   onChange={(event) => set("stationId", event.target.value)}
//                 >
//                   <option value="">Select a station</option>
//                   {(stations.data || []).map((station) => (
//                     <option key={station.id} value={station.id}>
//                       {station.name}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.stationId && <small>{errors.stationId}</small>}
//               </div>
//               <div className="field">
//                 <label htmlFor="public-area">Area</label>
//                 <select
//                   className="select"
//                   id="public-area"
//                   required
//                   value={values.deliveryZoneId}
//                   onChange={(event) => set("deliveryZoneId", event.target.value)}
//                 >
//                   <option value="">Select an area</option>
//                   {(zones.data || [])
//                     .filter((zone) => zone.active)
//                     .map((zone) => (
//                       <option key={zone.id} value={zone.id}>
//                         {zone.name}
//                       </option>
//                     ))}
//                 </select>
//                 {errors.deliveryZoneId && <small>{errors.deliveryZoneId}</small>}
//               </div>
//               <div className="field">
//                 <span className="field-label">Delivery fee</span>
//                 <div className="delivery-fee-card" aria-live="polite">
//                   <div>
//                     <span className="delivery-fee-caption">Calculated fee</span>
//                     <strong>
//                       {deliveryFee == null
//                         ? "Select station and area"
//                         : `₦${deliveryFee.toLocaleString()}`}
//                     </strong>
//                   </div>
//                   <span className="delivery-fee-zone">
//                     {selectedDistance
//                       ? `${selectedDistance.distanceKm} km`
//                       : "Distance will appear here"}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </fieldset>
//           <fieldset>
//             <legend>5. Delivery type</legend>
//             <label htmlFor="public-delivery-type">Delivery type</label>
//             <select
//               className="select"
//               id="public-delivery-type"
//               required
//               value={values.deliveryType}
//               onChange={(event) =>
//                 set("deliveryType", event.target.value as "NORMAL" | "EXPRESS")
//               }
//             >
//               <option value="NORMAL">Normal delivery</option>
//               <option value="EXPRESS">Express/Charter delivery</option>
//             </select>
//           </fieldset>
//           <fieldset>
//             <legend>6. Payment</legend>
//             <select
//               className="select"
//               value={values.paymentMethod}
//               onChange={(e) => set("paymentMethod", e.target.value)}
//             >
//               <option value="PAYMENT_ON_DELIVERY">Payment on delivery</option>
//               <option value="ALREADY_PAID">Already paid</option>
//             </select>
//             <Field
//               label="Value of product"
//               type="number"
//               required
//             />
//           </fieldset>
//           {mutation.isError && (
//             <p className="form-error">
//               We could not submit this request. The link may be invalid or
//               expired, or the details may need attention.
//             </p>
//           )}
//           <button
//             className="button button-primary button-full"
//             disabled={mutation.isPending}
//           >
//             {mutation.isPending ? (
//               "Submitting..."
//             ) : (
//               <>
//                 Submit delivery request <ArrowRight size={17} />
//               </>
//             )}
//           </button>
//         </form>
//         <p className="public-foot">
//           <Link href="/login">Staff sign in</Link>
//         </p>
//       </div>
//     </main>
//   );
// }
// function Field({
//   label,
//   value,
//   onChange,
//   type = "text",
//   onBlur,
//   required = false,
//   error,
// }: {
//   label: string;
//   value: string;
//   onChange: (value: string) => void;
//   type?: string;
//   onBlur?: () => void;
//   required?: boolean;
//   error?: string;
// }) {
//   return (
//     <div className="field">
//       <label>{label}</label>
//       <input
//         className="input"
//         required={required || (label !== "Notes" && label !== "Pickup instructions")}
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         onBlur={onBlur}
//       />
//       {error && <small>{error}</small>}
//     </div>
//   );
// }


"use client";

import Image from "next/image";
import { ArrowRight, Camera, CheckCircle2, X } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { normalizeNigerianPhone } from "@/lib/phone";

type Values = {
  senderName: string;
  senderPhoneNumber: string;
  receiverName: string;
  receiverPhoneNumber: string;
  deliveryAddress: string;
  stationId: string;
  deliveryZoneId: string;
  pickupMethod: "SENDER_DROPOFF" | "RIDER_PICKUP";
  pickupAddress: string;
  pickupInstructions: string;
  paymentMethod: "ALREADY_PAID" | "PAYMENT_ON_DELIVERY";
  deliveryType: "NORMAL" | "EXPRESS";
};
const initialValues: Values = {
  senderName: "",
  senderPhoneNumber: "",
  receiverName: "",
  receiverPhoneNumber: "",
  deliveryAddress: "",
  stationId: "",
  deliveryZoneId: "",
  pickupMethod: "RIDER_PICKUP",
  pickupAddress: "",
  pickupInstructions: "",
  paymentMethod: "PAYMENT_ON_DELIVERY",
  deliveryType: "NORMAL",
};
function removeEmptyValues(values: Values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== "" && value != null),
  );
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const maxDimension = 1600;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(sourceUrl);
          if (!blob) return reject(new Error("IMAGE_COMPRESSION_FAILED"));
          resolve(
            new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
              type: "image/webp",
            }),
          );
        },
        "image/webp",
        0.78,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("IMAGE_COMPRESSION_FAILED"));
    };
    image.src = sourceUrl;
  });
}
type Props = { params: Promise<{ token: string }> };
export default function PublicOrderPage({ params }: Props) {
    const { token } = use(params);
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
  });
  const settings = useQuery({
    queryKey: ["company-settings"],
    queryFn: api.getSettings,
  });
  const stations = useQuery({
    queryKey: ["public-stations"],
    queryFn: api.getPublicStations,
  });
  const [values, setValues] = useState(initialValues);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationTarget, setValidationTarget] = useState("");
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [created, setCreated] = useState<Awaited<
    ReturnType<typeof api.createOrder>
  > | null>(null);
  const senderProfile = useQuery({
    queryKey: ["public-sender", token],
    queryFn: () => api.getPublicSender(token),
    enabled: Boolean(token),
  });
  useEffect(() => {
    const sender = senderProfile.data;
    if (!sender) return;
    const prefill = window.setTimeout(() => {
      setValues((current) => ({
        ...current,
        senderName: current.senderName || sender.senderName || "",
        senderPhoneNumber: current.senderPhoneNumber || sender.senderPhoneNumber || "",
      }));
    }, 0);
    return () => window.clearTimeout(prefill);
  }, [senderProfile.data]);
  const selectedDistance = stations.data
    ?.find((station) => station.id === values.stationId)
    ?.zoneDistances?.find((distance) => distance.deliveryZoneId === values.deliveryZoneId);
  const baseFeeBeforeExpress = selectedDistance
    ? Number(settings.data?.fixedDeliveryRate || 0) +
      Number(settings.data?.variableDeliveryRate || 0) * Number(selectedDistance.distanceKm)
    : 0;
  const expressMultiplier =
    values.deliveryType === "EXPRESS"
      ? Number(settings.data?.expressMultiplier || 1)
      : 1;
  const baseFee = baseFeeBeforeExpress * expressMultiplier;
  const riderCommissionAmount =
    (Number(settings.data?.riderCommissionRate || 0) * baseFee) / 100;
  const vatAmount =
    (Number(settings.data?.vat || 0) * (baseFee + riderCommissionAmount)) / 100;
  const deliveryFee = baseFee + riderCommissionAmount + vatAmount;
  const mutation = useMutation({
    mutationFn: () =>
      api.createOrder(
        {
          ...removeEmptyValues({
            ...values,
            senderPhoneNumber: normalizeNigerianPhone(values.senderPhoneNumber),
            receiverPhoneNumber: normalizeNigerianPhone(
              values.receiverPhoneNumber,
            ),
          }),
          deliveryFee,
        },
        images.map((image) => image.file),
      ),

    onSuccess: setCreated,
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
   function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requiredFields: [keyof Values, string][] = [
      ["senderName", "Sender or business name not filled."],
      ["senderPhoneNumber", "Sender phone number not filled."],
      ["pickupAddress", "Sender pickup address not filled."],
      ["receiverName", "Receiver name not filled."],
      ["receiverPhoneNumber", "Receiver phone number not filled."],
      ["deliveryAddress", "Delivery address not filled."],
      ["stationId", "Select a station."],
      ["deliveryZoneId", "Select a delivery area."],
    ];
    const missingField = requiredFields.find(([key]) => !values[key].trim());
    if (missingField) {
      setValidationMessage(missingField[1]);
      setValidationTarget(missingField[0]);
      return;
    }
    if (values.senderPhoneNumber.trim().length < 7) {
      setValidationMessage("Sender Phone number must be at least 7 digits.");
      setValidationTarget("senderPhoneNumber");
      return;
    }
    if (values.receiverPhoneNumber.trim().length < 7) {
      setValidationMessage("Receiver Phone number must be at least 7 digits.");
      setValidationTarget("receiverPhoneNumber");
      return;
    }
    if (images.length === 0) {
      setValidationMessage("Photo of Goods not added");
      setValidationTarget("productImages");
      return;
    }
    setValidationMessage("");
    setValidationTarget("");
    mutation.mutate();
  }
  async function openCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setCameraError(
        "Camera permission was denied. Please allow camera access and try again.",
      );
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }
  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || images.length >= 3) return;
    const canvas = document.createElement("canvas");
    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setCameraError("That photo could not be captured. Please try again.");
          return;
        }
        const file = await compressImage(
          new File([blob], `product-${Date.now()}.webp`, {
            type: "image/webp",
          }),
        );
        setImages((current) => [
          ...current,
          { file, url: URL.createObjectURL(file) },
        ]);
        setCameraError("");
        closeCamera();
      },
      "image/webp",
      0.78,
    );
  }
  useEffect(() => closeCamera, []);
  if (created)
    return (
      <main className="public-page">
        <div className="public-card success-card">
          <CheckCircle2 size={40} color="#2d9862" />
          <h1>Order Created Successfully</h1>
          <div className="code-box">
            <span>Order ID</span>
            <strong>{created.orderId || "Generated by backend"}</strong>
          </div>
          <p className="subtext">
            Status: Pending Approval. The owner will review your order before
            delivery begins.
          </p>
          <a href="/create-order" className="button button-primary">
            Create another order
          </a>
        </div>
      </main>
    );
  return (
    <main className="public-page">
      {validationMessage && (
        <div className="validation-dialog-backdrop">
          <section
            className="validation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="validation-dialog-title"
          >
            <p className="eyebrow">Check your order</p>
            <h2 id="validation-dialog-title">{validationMessage}</h2>
            <button
              type="button"
              className="button button-primary button-full"
              onClick={() => {
                setValidationMessage("");
                requestAnimationFrame(() => {
                  const targetId =
                    validationTarget === "productImages"
                      ? "product-image-upload"
                      : validationTarget === "stationId"
                        ? "create-station"
                        : validationTarget === "deliveryZoneId"
                          ? "create-area"
                          : `create-${validationTarget}`;
                  const target = document.getElementById(targetId);
                  target?.scrollIntoView({ behavior: "smooth", block: "center" });
                  if (target instanceof HTMLElement) target.focus();
                });
              }}
            >
              Continue
            </button>
          </section>
        </div>
      )}
      <div className="public-card">
        <header className="public-header">
          <p className="eyebrow">Shagil Delivery Service</p>
          <h1>Create Your Delivery</h1>
          <p className="subtext">
            Complete the order details. No account or special link is required.
          </p>
        </header>
        <form
          className="public-form"
          noValidate
          onSubmit={submitOrder}
        >
          <Section title="1. Sender information">
            <div className="form-grid">
              <Field
                label="Sender / business name"
                id="create-senderName"
                value={values.senderName}
                required
                onChange={(v) => set("senderName", v)}
              />
              <Field
                label="Sender phone number"
                id="create-senderPhoneNumber"
                type="tel"
                required
                value={values.senderPhoneNumber}
                onChange={(v) => set("senderPhoneNumber", v)}
                onBlur={() =>
                  set(
                    "senderPhoneNumber",
                    normalizeNigerianPhone(values.senderPhoneNumber),
                  )
                }
              />
              <div className="form-grid">
                <Field
                  label="Sender address/  pickup address"
                  id="create-pickupAddress"
                  required
                  value={values.pickupAddress}
                  onChange={(v) => set("pickupAddress", v)}
                />
              </div>
            </div>
          </Section>
          <Section title="2. Receiver information">
            <div className="form-grid">
              <Field
                label="Receiver name"
                id="create-receiverName"
                required
                value={values.receiverName}
                onChange={(v) => set("receiverName", v)}
              />
              <Field
                label="Receiver phone number"
                id="create-receiverPhoneNumber"
                type="tel"
                required
                value={values.receiverPhoneNumber}
                onChange={(v) => set("receiverPhoneNumber", v)}
                onBlur={() =>
                  set(
                    "receiverPhoneNumber",
                    normalizeNigerianPhone(values.receiverPhoneNumber),
                  )
                }
              />
          <Section title="Delivery type">
            <div className="field">
              <label htmlFor="delivery-type">Delivery type</label>
              <select
                className="select"
                id="delivery-type"
                required
                value={values.deliveryType}
                onChange={(event) =>
                  set("deliveryType", event.target.value as Values["deliveryType"])
                }
              >
                <option value="NORMAL">Normal delivery</option>
                <option value="EXPRESS">Express/Charter delivery</option>
              </select>
            </div>
          </Section>
              <Field
                label="Receiver / Delivery address"
                id="create-deliveryAddress"
                required
                value={values.deliveryAddress}
                onChange={(v) => set("deliveryAddress", v)}
              />
              <div className="field">
                <label htmlFor="create-station">
                  Shagil nearest branch to you
                </label>
                <select
                  className="select"
                  id="create-station"
                  required
                  value={values.stationId}
                  onChange={(event) => set("stationId", event.target.value)}
                >
                  <option value="">Select Shagil nearest branch</option>
                  {(stations.data || []).map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="create-area">Delivery Area</label>
                <select
                  className="select"
                  id="create-area"
                  required
                  value={values.deliveryZoneId}
                  onChange={(e) => set("deliveryZoneId", e.target.value)}
                  disabled={!values.stationId}
                >
                  <option value="">{values.stationId ? "Select an area" : "Select the nearest station first"}</option>
                  {(zones.data || [])
                    .filter((zone) => zone.active)
                    .map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                </select>
                {!values.stationId && <small className="field-help">Select the nearest station first.</small>}
              </div>
              {/* Delivery Area fee when selected */}
              <div className="field">
                <span className="field-label">Delivery fee</span>
                <div className="delivery-fee-card" aria-live="polite">
                  <div>
                    <span className="delivery-fee-caption">Current fee</span>
                    <strong>
                      {values.deliveryZoneId
                        ? `₦${Number(
                            deliveryFee || 0,
                          ).toLocaleString()}`
                        : "Select an area"}
                    </strong>
                  </div>
                  <span className="delivery-fee-zone">
                    {selectedDistance
                      ? `${selectedDistance.distanceKm} km`
                      : "Distance will appear here"}
                  </span>
                </div>
                <p className="delivery-fee-note">
                  This price is for regular parcel size. The picture of your
                  package will be reviewed for actual price.
                </p>
              </div>
            </div>
          </Section>
          <Section title="4. Product">
            <div className="form-grid">
              <p className="field-hint field-span">
                Add a clear picture of the package for price review.
              </p>
            </div>
            <button
              type="button"
              className="upload-field"
              id="product-image-upload"
              onClick={openCamera}
              disabled={images.length >= 5}
            >
              <Camera size={18} /> Snap product photo
            </button>
            {cameraError && (
              <p className="form-error" role="alert">
                {cameraError}
              </p>
            )}
            {images.length > 0 && (
              <div className="upload-previews">
                {images.map((image, index) => (
                  <div key={image.url}>
                    <Image
                      src={image.url}
                      alt={image.file.name}
                      width={160}
                      height={160}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${image.file.name}`}
                      onClick={() =>
                        setImages((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="6. Payment">
            <select
              className="select"
              value={values.paymentMethod}
              onChange={(e) =>
                set("paymentMethod", e.target.value as Values["paymentMethod"])
              }
            >
              <option value="ALREADY_PAID">Payment before delivery</option>
              <option value="PAYMENT_ON_DELIVERY">Payment on delivery</option>
            </select>
          </Section>
                      {validationTarget === "productImages" && (
              <p className="form-error" role="alert">
                {validationMessage
                  ? validationMessage
                  : "Photo of goods not added."}
              </p>)}
          {mutation.isError && (
            <p className="form-error" role="alert">
              We could not create this order. Check the details and try again.
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
                Submit <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </div>
      {cameraOpen && (
        <div className="camera-backdrop">
          <div
            className="camera-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-title"
          >
            <div className="camera-header">
              <h2 id="camera-title">Snap product photo</h2>
              <button
                type="button"
                className="icon-button"
                onClick={closeCamera}
                aria-label="Close camera"
              >
                <X size={20} />
              </button>
            </div>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="camera-preview"
            />
            <div className="camera-controls">
              <button
                type="button"
                className="button button-secondary"
                onClick={closeCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={capturePhoto}
                disabled={images.length >= 5}
              >
                <Camera size={18} /> Capture photo
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  onBlur,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  onBlur?: () => void;
  id?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        id={id}
        className="input"
        aria-required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}


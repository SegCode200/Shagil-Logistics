"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { normalizeNigerianPhone } from "@/lib/phone";

type Values = {
  senderName: string;
  senderPhoneNumber: string;
  receiverName: string;
  receiverPhoneNumber: string;
  deliveryAddress: string;
  deliveryZoneId: string;
  pickupMethod: "SENDER_DROPOFF" | "RIDER_PICKUP";
  pickupAddress: string;
  pickupInstructions: string;
  orderDetails: string;
  quantity: string;
  packageNotes: string;
  paymentMethod: "ALREADY_PAID" | "PAYMENT_ON_DELIVERY";
  orderAmount: string;
};
const initialValues: Values = {
  senderName: "",
  senderPhoneNumber: "",
  receiverName: "",
  receiverPhoneNumber: "",
  deliveryAddress: "",
  deliveryZoneId: "",
  pickupMethod: "SENDER_DROPOFF",
  pickupAddress: "",
  pickupInstructions: "",
  orderDetails: "",
  quantity: "1",
  packageNotes: "",
  paymentMethod: "PAYMENT_ON_DELIVERY",
  orderAmount: "",
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
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(sourceUrl);
        if (!blob) return reject(new Error("IMAGE_COMPRESSION_FAILED"));
        resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }));
      }, "image/webp", 0.78);
    };
    image.onerror = () => { URL.revokeObjectURL(sourceUrl); reject(new Error("IMAGE_COMPRESSION_FAILED")); };
    image.src = sourceUrl;
  });
}

export default function CreateOrderPage() {
  const zones = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: api.getDeliveryZones,
  });
  const [values, setValues] = useState(initialValues);
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [created, setCreated] = useState<Awaited<
    ReturnType<typeof api.createOrder>
  > | null>(null);  
  
  const mutation = useMutation({
    mutationFn: () =>
      api.createOrder({
        ...removeEmptyValues({
          ...values,
          senderPhoneNumber: normalizeNigerianPhone(values.senderPhoneNumber),
          receiverPhoneNumber: normalizeNigerianPhone(values.receiverPhoneNumber),
        }),
        quantity: Number(values.quantity),
        orderAmount: values.orderAmount
          ? Number(values.orderAmount)
          : undefined,
        images: images.map((image) => ({
          name: image.file.name,
          url: image.url,
        })),
      }),
    onSuccess: setCreated,
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
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
      setCameraError("Camera permission was denied. Please allow camera access and try again.");
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
    if (!video || images.length >= 5) return;
    const canvas = document.createElement("canvas");
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError("That photo could not be captured. Please try again.");
        return;
      }
      const file = await compressImage(new File([blob], `product-${Date.now()}.webp`, { type: "image/webp" }));
      setImages((current) => [...current, { file, url: URL.createObjectURL(file) }]);
      setCameraError("");
      if (images.length + 1 >= 5) closeCamera();
    }, "image/webp", 0.78);
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
          <Link href="/create-order" className="button button-primary">
            Create another order
          </Link>
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
            Complete the order details. No account or special link is required.
          </p>
        </header>
        <form
          className="public-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Section title="1. Sender information">
            <div className="form-grid">
              <Field
                label="Sender / business name"
                value={values.senderName}
                required
                onChange={(v) => set("senderName", v)}
              />
              <Field
                label="Sender phone number"
                type="tel"
                required
                value={values.senderPhoneNumber}
                onChange={(v) => set("senderPhoneNumber", v)}
                onBlur={() => set("senderPhoneNumber", normalizeNigerianPhone(values.senderPhoneNumber))}
              />
            </div>
          </Section>
          <Section title="2. Receiver information">
            <div className="form-grid">
              <Field
                label="Receiver name"
                required
                value={values.receiverName}
                onChange={(v) => set("receiverName", v)}
              />
              <Field
                label="Receiver phone number"
                type="tel"
                required
                value={values.receiverPhoneNumber}
                onChange={(v) => set("receiverPhoneNumber", v)}
                onBlur={() => set("receiverPhoneNumber", normalizeNigerianPhone(values.receiverPhoneNumber))}
              />
              <Field
                label="Receiver delivery address"
                required
                value={values.deliveryAddress}
                onChange={(v) => set("deliveryAddress", v)}
              />
              <div className="field">
                <label htmlFor="create-area">Area</label>
                <select
                  className="select"
                  id="create-area"
                  required
                  value={values.deliveryZoneId}
                  onChange={(e) => set("deliveryZoneId", e.target.value)}
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
          </Section>
          <Section title="3. Pickup">
            <select
              className="select"
              value={values.pickupMethod}
              onChange={(e) =>
                set("pickupMethod", e.target.value as Values["pickupMethod"])
              }
            >
              <option value="SENDER_DROPOFF">
                Sender drops package at company office
              </option>
              <option value="RIDER_PICKUP">
                Rider picks package from sender
              </option>
            </select>
            {values.pickupMethod === "RIDER_PICKUP" ? (
              <div className="form-grid public-followup">
                <Field
                  label="Pickup address"
                  required
                  value={values.pickupAddress}
                  onChange={(v) => set("pickupAddress", v)}
                />
                <Field
                  label="Pickup instructions"
                  value={values.pickupInstructions}
                  onChange={(v) => set("pickupInstructions", v)}
                />
              </div>
            ) : (
              <p className="form-hint">
                After submitting, bring the package to the company office for
                receiving.
              </p>
            )}
          </Section>
          <Section title="4. Product">
            <div className="form-grid">
              <Field
                label="Product description"
                required
                value={values.orderDetails}
                onChange={(v) => set("orderDetails", v)}
              />
              <Field
                label="Quantity"
                type="number"
                required
                value={values.quantity}
                onChange={(v) => set("quantity", v)}
              />
              <Field
                label="Package Notes"
                value={values.packageNotes}
                onChange={(v) => set("packageNotes", v)}
              />
            </div>
            <button type="button" className="upload-field" onClick={openCamera} disabled={images.length >= 5}><Camera size={18} /> Snap product photo</button>
            {cameraError && <p className="form-error" role="alert">{cameraError}</p>}
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
              <option value="ALREADY_PAID">Already paid</option>
              <option value="PAYMENT_ON_DELIVERY">Payment on delivery</option>
            </select>
              <Field
                label="Order / product amount"
                type="number"
                required
                value={values.orderAmount}
                onChange={(v) => set("orderAmount", v)}
              />
            <p className="form-hint text-red-600">
              Delivery fee might change depending on the size of your goods.
            </p>
          </Section>
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
              "Creating order..."
            ) : (
              <>
                Create Order <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <p className="public-foot">
          <Link href="/login">Staff sign in</Link>
        </p>
      </div>
      {cameraOpen && <div className="camera-backdrop"><div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-title"><div className="camera-header"><h2 id="camera-title">Snap product photo</h2><button type="button" className="icon-button" onClick={closeCamera} aria-label="Close camera"><X size={20} /></button></div><video ref={videoRef} autoPlay muted playsInline className="camera-preview" /><div className="camera-controls"><button type="button" className="button button-secondary" onClick={closeCamera}>Cancel</button><button type="button" className="button button-primary" onClick={capturePhoto} disabled={images.length >= 5}><Camera size={18} /> Capture photo</button></div></div></div>}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  onBlur?: () => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input"
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

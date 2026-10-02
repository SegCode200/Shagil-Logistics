"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";

type RiderPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type PushStatus =
  | "checking"
  | "ready"
  | "enabled"
  | "unsupported"
  | "install-required"
  | "error";

function decodeApplicationServerKey(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function serializeSubscription(subscription: PushSubscription): RiderPushSubscription {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh, auth },
  };
}

export function RiderPushNotifications() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");

  useEffect(() => {
    let active = true;
    async function checkExistingSubscription() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      if (isIos && !isStandalone) {
        setStatus("install-required");
        return;
      }
      try {
        const keyResponse = await api.getWebPushVapidPublicKey();
        if (!active) return;
        setPublicKey(keyResponse.publicKey);
        const registration = await navigator.serviceWorker.getRegistration("/rider/");
        const existingSubscription = await registration?.pushManager.getSubscription();
        if (!active) return;
        setSubscription(existingSubscription || null);
        if (existingSubscription) {
          await api.registerRiderPushSubscription(
            serializeSubscription(existingSubscription),
          );
          if (active) setStatus("enabled");
        } else {
          setStatus("ready");
        }
      } catch (subscriptionError) {
        if (!active) return;
        setStatus("error");
        setMessage(
          subscriptionError instanceof Error
            ? subscriptionError.message
            : "Could not check this device's notification settings.",
        );
      }
    }

    void checkExistingSubscription();
    return () => {
      active = false;
    };
  }, []);

  async function enableNotifications() {
    if (!publicKey) {
      setStatus("error");
      setMessage("Push notifications are not configured yet.");
      return;
    }

    setStatus("checking");
    setMessage("");
    try {
      if (Notification.permission === "denied") {
        throw new Error("Notifications are blocked in your browser settings.");
      }
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      if (isIos && !isStandalone) {
        setStatus("install-required");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Allow notifications to receive new delivery alerts.");
      }

      await navigator.serviceWorker.register("/rider/sw.js", {
        scope: "/rider/",
        updateViaCache: "none",
      });
      const registration = await navigator.serviceWorker.ready;
      const nextSubscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        }));

      await api.registerRiderPushSubscription(
        serializeSubscription(nextSubscription),
      );
      setSubscription(nextSubscription);
      setStatus("enabled");
      setMessage("This device will receive rider delivery notifications.");
    } catch (subscriptionError) {
      setStatus("error");
      setMessage(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : "Could not enable notifications on this device.",
      );
    }
  }

  async function disableNotifications() {
    if (!subscription) return;
    setStatus("checking");
    setMessage("");
    try {
      await api.removeRiderPushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
      setStatus("ready");
      setMessage("Notifications are turned off on this device.");
    } catch (subscriptionError) {
      setStatus("error");
      setMessage(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : "Could not turn off notifications on this device.",
      );
    }
  }

  return (
    <section className="panel rider-push-panel" aria-labelledby="rider-push-title">
      <div className="rider-push-heading">
        <span className="rider-push-icon" aria-hidden="true">
          {status === "enabled" ? <Bell size={18} /> : <BellOff size={18} />}
        </span>
        <div>
          <h2 id="rider-push-title">Delivery notifications</h2>
          <p>
            {status === "enabled"
              ? "Enabled for this device"
              : "Get an alert when a delivery is assigned or changed"}
          </p>
        </div>
      </div>
      {message && (
        <p
          className={status === "error" ? "form-error rider-push-message" : "success-text rider-push-message"}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
      {status === "unsupported" ? (
        <p className="subtext">{message || "This browser does not support push notifications."}</p>
      ) : status === "install-required" ? (
        <p className="subtext">
          Install Shagil Rider to your iPhone Home Screen before enabling notifications.
        </p>
      ) : status === "enabled" ? (
        <button
          type="button"
          className="button button-secondary"
          onClick={disableNotifications}
        >
          Turn off on this device
        </button>
      ) : (
        <button
          type="button"
          className="button button-primary"
          disabled={status === "checking" || !publicKey}
          onClick={enableNotifications}
        >
          {status === "checking" ? <LoaderCircle className="spin" size={16} /> : <Bell size={16} />}
          {status === "checking" ? "Setting up..." : "Enable notifications"}
        </button>
      )}
    </section>
  );
}

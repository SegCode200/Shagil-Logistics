self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "You have a new delivery update." };
  }

  const title = payload.title || "Shagil Rider";
  const options = {
    body: payload.body || "You have a new delivery update.",
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    tag: payload.tag || "shagil-rider-update",
    data: { url: payload.url || "/rider/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(
    event.notification.data?.url || "/rider/dashboard",
    self.location.origin,
  );
  if (destination.origin !== self.location.origin) {
    destination.href = new URL("/rider/dashboard", self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existingWindow = windows.find((client) => "focus" in client);
      if (existingWindow) {
        return existingWindow.navigate(destination.href).then((client) => client?.focus());
      }
      return self.clients.openWindow(destination.href);
    }),
  );
});

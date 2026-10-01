import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shagil Rider",
  description: "Rider access to assigned deliveries.",
  manifest: "/rider-app.webmanifest",
};

export default function RiderAppLayout({ children }: LayoutProps<"/rider/app">) {
  return children;
}

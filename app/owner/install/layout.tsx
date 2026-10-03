import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install Shagil Owner",
  description: "Install the Shagil owner workspace.",
  manifest: "/owner-app.webmanifest",
};

export default function OwnerInstallLayout({ children }: LayoutProps<"/owner/install">) {
  return children;
}
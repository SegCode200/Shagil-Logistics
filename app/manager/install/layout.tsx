import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install Shagil Manager",
  description: "Install the Shagil station manager workspace.",
  manifest: "/station-manager-app.webmanifest",
};

export default function ManagerInstallLayout({ children }: LayoutProps<"/manager/install">) {
  return children;
}
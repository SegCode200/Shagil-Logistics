"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/primitives";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    const destination = !user
      ? "/login"
      : user.role === "OWNER"
        ? "/owner/dashboard"
        : user.role === "STATION_MANAGER"
          ? "/manager/dashboard"
          : "/rider/dashboard";
    router.replace(destination);
  }, [isLoading, router, user]);
  return <LoadingState label="Opening Shagil" />;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/ui/primitives";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) router.replace(user ? (user.role === "OWNER" ? "/owner/dashboard" : "/rider/dashboard") : "/login");
  }, [isLoading, router, user]);
  return <LoadingState label="Opening Shagil" />;
}

"use client";

import { ShieldAlert } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

export default function RiderAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .accessRider(token)
      .then(async (result) => {
          if (!active) return;
          
          console.log("Rider access result:", result);
        const sessionToken = result.token || result.accessToken;
        if (sessionToken) localStorage.setItem("auth_token", sessionToken);
        if (result.user) queryClient.setQueryData(["me"], result.user);
        // console.log("Rider access successful, redirecting to dashboard");
        else if (!sessionToken)
          await api
            .getCurrentUser()
            .then((user) => queryClient.setQueryData(["me"], user));
        router.replace("/rider/dashboard");
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [queryClient, router, token]);

  if (!error) return <LoadingState label="Opening rider access" />;
  return (
    <main className="public-page">
      <div className="public-card access-revoked">
        <ShieldAlert size={40} />
        <p className="eyebrow">Rider access</p>
        <h1>Access Revoked</h1>
        <p className="subtext">
          Please contact the administrator for a new access link.
        </p>
      </div>
    </main>
  );
}

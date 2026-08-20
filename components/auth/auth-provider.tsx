"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

const AuthContext = createContext<{
  user: User | null;
  isLoading: boolean;
  login: (data: { phone: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}>({
  user: null,
  isLoading: true,
  login: async () => {
    throw new Error("Not ready");
  },
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const hasSession =
    typeof window !== "undefined" &&
    (Boolean(localStorage.getItem("auth_token")) || document.cookie.length > 0);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: api.getCurrentUser,
    enabled: hasSession,
    retry: false,
  });
  useEffect(() => {
    if (query.error) localStorage.removeItem("auth_token");
  }, [query.error]);
  async function login(data: { phone: string; password: string }) {
    const result = await api.login(data);
    const token = result.token || result.accessToken;
    if (token) localStorage.setItem("auth_token", token);
    const user = result.user || (await api.getCurrentUser());
    queryClient.setQueryData(["me"], user);
    return user;
  }
  async function logout() {
    await api.logout();
    localStorage.removeItem("auth_token");
    queryClient.clear();
  }
  return (
    <AuthContext.Provider
      value={{
        user: query.data || null,
        isLoading: hasSession && query.isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRoleRedirect(role?: User["role"]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (role && user.role !== role)
      router.replace(
        user.role === "OWNER" ? "/owner/dashboard" : "/rider/dashboard",
      );
  }, [isLoading, role, router, user]);
  return { user, isLoading };
}

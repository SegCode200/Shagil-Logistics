"use client";

import { useState } from "react";
import {
  LockKeyhole,
  ArrowRight,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      console.log("Attempting login with identifier:", identifier);
      const user = await login({ phone: identifier, password });
      router.replace(
        user.role === "OWNER" ? "/owner/dashboard" : "/rider/dashboard",
      );
    } catch {
      setError("Invalid login details.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-aside">
        <div className="brand">
          <span className="brand-mark">S</span>
          <span>Shagil</span>
        </div>
        <div>
          <p className="eyebrow">Order delivery, simply</p>
          <h1>Keep every delivery moving.</h1>
          <p>
            One calm workspace for creating orders, sharing delivery details,
            and confirming handoffs.
          </p>
        </div>
        <small>For small businesses that value a clear next step.</small>
      </div>
      <section className="login-card">
        <div className="login-card-head">
          <span className="eyebrow">Welcome back</span>
          <h2>Sign in to Shagil</h2>
          <p>Use your phone or email to continue.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <div className="field">
            <label htmlFor="identifier">Phone or email</label>
            <div className="input-icon">
              <Phone size={17} />
              <input
                className="input"
                id="identifier"
                required
                placeholder="+2347042604550 or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                className="input"
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>
            {busy ? (
              "Signing in..."
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import Captcha from "@/components/Captcha";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const captchaRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter both email and password.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(email, password, captchaToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in.");
      setSubmitting(false);
      captchaRef.current?.reset();
      setCaptchaToken("");
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Alloqo account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        <Field
          label="Password"
          action={
            <Link href="/forgot-password" className="text-brand font-medium hover:underline">
              Forgot password?
            </Link>
          }
        >
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        <Captcha ref={captchaRef} onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-down">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-foreground/60 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-brand font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-foreground/70">{label}</span>
        {action && <span className="text-xs">{action}</span>}
      </span>
      <label className="block">{children}</label>
    </div>
  );
}

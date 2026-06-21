"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import Captcha from "@/components/Captcha";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const captchaRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await signup(name, email, password, captchaToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
      setSubmitting(false);
      captchaRef.current?.reset();
      setCaptchaToken("");
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking Indian markets in minutes">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Turja Sen Das"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
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
        <Field label="Password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-foreground/60 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-foreground/70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

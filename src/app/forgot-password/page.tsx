"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import Captcha from "@/components/Captcha";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const captchaRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Enter your email address.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await requestPasswordReset(email, captchaToken);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
      setSubmitting(false);
      captchaRef.current?.reset();
      setCaptchaToken("");
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="We've sent you a password reset link">
        <p className="text-sm text-foreground/70">
          If an account exists for <span className="font-medium">{email}</span>, you&apos;ll
          receive an email with a link to reset your password.
        </p>
        <p className="text-sm text-foreground/60 mt-6">
          <Link href="/login" className="text-brand font-medium hover:underline">
            Back to log in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to reset it">
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
        <Captcha ref={captchaRef} onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-down">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-foreground/60 mt-6">
        Remembered your password?{" "}
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

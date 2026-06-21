"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const errorDescription = searchParams.get("error_description");
    if (errorDescription) {
      setLinkError(errorDescription);
      setVerifying(false);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setLinkError("This password reset link is invalid or has expired.");
      setVerifying(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setLinkError("This password reset link is invalid or has expired.");
      }
      setVerifying(false);
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
      setSubmitting(false);
    }
  }

  if (verifying) {
    return (
      <AuthShell title="Reset your password" subtitle="Verifying your link…">
        <p className="text-sm text-foreground/60">One moment…</p>
      </AuthShell>
    );
  }

  if (linkError) {
    return (
      <AuthShell title="Link expired" subtitle="That reset link no longer works">
        <p className="text-sm text-down">{linkError}</p>
        <p className="text-sm text-foreground/60 mt-6">
          <Link href="/forgot-password" className="text-brand font-medium hover:underline">
            Request a new link
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now log in with your new password">
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-lg bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand/90 transition-colors"
        >
          Go to log in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Make it something you'll remember">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        {error && <p className="text-sm text-down">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
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

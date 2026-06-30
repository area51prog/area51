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
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const captchaRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phoneNumber || !password) {
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
      await signup(name, email, `${countryCode}${phoneNumber}`, password, captchaToken);
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
        <Field label="Phone number">
          <div className="flex rounded-lg border border-line bg-surface focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="shrink-0 rounded-l-lg bg-transparent text-foreground text-sm px-2.5 py-2.5 outline-none border-r border-line cursor-pointer"
            >
              {COUNTRY_CODES.map(({ code, label }) => (
                <option key={label} value={code}>{label}</option>
              ))}
            </select>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="98765 43210"
              className="flex-1 min-w-0 rounded-r-lg bg-transparent text-foreground px-3 py-2.5 text-sm outline-none"
            />
          </div>
        </Field>
        <p className="text-xs text-foreground/40 -mt-2">Used only for account security. Never shared or used for marketing.</p>
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

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+1", label: "🇨🇦 +1" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+974", label: "🇶🇦 +974" },
  { code: "+966", label: "🇸🇦 +966" },
  { code: "+60", label: "🇲🇾 +60" },
  { code: "+64", label: "🇳🇿 +64" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+81", label: "🇯🇵 +81" },
  { code: "+82", label: "🇰🇷 +82" },
  { code: "+86", label: "🇨🇳 +86" },
  { code: "+55", label: "🇧🇷 +55" },
  { code: "+27", label: "🇿🇦 +27" },
  { code: "+234", label: "🇳🇬 +234" },
  { code: "+254", label: "🇰🇪 +254" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-foreground/70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

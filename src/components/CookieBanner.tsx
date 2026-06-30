"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cookie consent categories. Add new ones here as needed (e.g. "analytics", "marketing").
// Each key maps to whether the user has consented to that category.
export interface CookieConsent {
  essential: true; // always true — no opt-out for essential cookies
  // analytics?: boolean;  // uncomment when you add analytics
}

const STORAGE_KEY = "cookie_consent";
const CURRENT_VERSION = 1; // bump when categories change to re-prompt users

interface StoredConsent {
  version: number;
  consent: CookieConsent;
  acceptedAt: string;
}

export function getCookieConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredConsent = JSON.parse(raw);
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  function accept() {
    const stored: StoredConsent = {
      version: CURRENT_VERSION,
      consent: { essential: true },
      acceptedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 flex justify-center">
      <div className="w-full max-w-2xl rounded-xl border border-line bg-surface shadow-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-foreground/70 leading-relaxed">
          We use essential cookies to keep you signed in and the app running.{" "}
          <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="text-brand hover:underline">Terms of Service</Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

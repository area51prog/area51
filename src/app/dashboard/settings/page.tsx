"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui";

interface ProvidersStatus {
  upstoxConfigured: boolean;
  upstoxConnected: boolean;
  upstoxExpiresAt: number | null;
  finnhubConfigured: boolean;
}

const UPSTOX_MESSAGES: Record<string, { tone: "up" | "down"; text: string }> = {
  connected: { tone: "up", text: "Upstox connected successfully." },
  error: { tone: "down", text: "Upstox connection failed. Check your client ID/secret and redirect URI, then try again." },
  not_configured: { tone: "down", text: "Add UPSTOX_CLIENT_ID and UPSTOX_CLIENT_SECRET to .env.local first." },
};

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(user?.name ?? "");
  const [saved, setSaved] = useState(false);
  const [providers, setProviders] = useState<ProvidersStatus | null>(null);
  const upstoxMessage = UPSTOX_MESSAGES[searchParams.get("upstox") ?? ""];

  useEffect(() => {
    fetch("/api/upstox/status")
      .then((res) => res.json())
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  async function handleDisconnectUpstox() {
    await fetch("/api/upstox/disconnect", { method: "POST" });
    setProviders((prev) => (prev ? { ...prev, upstoxConnected: false } : prev));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOutEverywhere() {
    if (confirm("Sign out and clear locally cached app data (theme, cached research reports) on this device?")) {
      localStorage.clear();
      await logout();
      router.push("/login");
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      {upstoxMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            upstoxMessage.tone === "up" ? "border-up/30 text-up bg-up/5" : "border-down/30 text-down bg-down/5"
          }`}
        >
          {upstoxMessage.tone === "up" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {upstoxMessage.text}
        </div>
      )}

      <Card title="Market data providers">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">Upstox</div>
              <div className="text-xs text-foreground/50">
                Primary provider for NSE live quotes. Access tokens expire daily at 3:30am IST.
              </div>
            </div>
            {providers?.upstoxConnected ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-up">
                  <CheckCircle2 size={14} /> Connected
                </span>
                <button
                  onClick={handleDisconnectUpstox}
                  className="text-xs font-semibold text-foreground/50 hover:text-down"
                >
                  Disconnect
                </button>
              </div>
            ) : providers?.upstoxConfigured ? (
              <a
                href="/api/upstox/login"
                className="rounded-lg bg-brand text-white text-xs font-semibold px-3.5 py-2 hover:bg-brand/90"
              >
                Connect Upstox
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/40">
                <Circle size={14} /> Not configured
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <div className="text-sm font-semibold text-heading">Finnhub</div>
              <div className="text-xs text-foreground/50">Fallback provider — used when Upstox has no data for a symbol.</div>
            </div>
            {providers?.finnhubConfigured ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-up">
                <CheckCircle2 size={14} /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/40">
                <Circle size={14} /> Not configured
              </span>
            )}
          </div>

          <p className="text-xs text-foreground/40 pt-1">
            Provider order: Upstox → Finnhub → mock data. The Live/Mock badge next to prices throughout the app shows which one served each quote.
          </p>
        </div>
      </Card>

      <Card title="Profile">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Email</span>
            <input
              disabled
              value={user?.email ?? ""}
              className="w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-foreground/50"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90"
            >
              Save changes
            </button>
            {saved && <span className="text-sm text-up">Saved.</span>}
          </div>
        </form>
      </Card>

      <Card title="Notifications">
        <div className="space-y-3 text-sm">
          <Toggle label="Price alerts for watchlist" defaultChecked />
          <Toggle label="Upcoming dividend reminders" defaultChecked />
          <Toggle label="New research report ready" defaultChecked />
        </div>
      </Card>

      <Card title="Danger zone" className="border-down/30">
        <p className="text-sm text-foreground/60 mb-3">
          Sign out and clear locally cached app data on this device. Your portfolio and watchlist are stored in the
          database and are not affected. Account deletion isn&apos;t available yet — contact support if you need your
          account removed.
        </p>
        <button
          onClick={handleSignOutEverywhere}
          className="rounded-lg border border-down text-down text-sm font-semibold px-4 py-2 hover:bg-down/5"
        >
          Sign out &amp; clear local data
        </button>
      </Card>
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(Boolean(defaultChecked));
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-foreground/70">{label}</span>
      <button
        type="button"
        onClick={() => setOn((o) => !o)}
        className={`w-10 h-6 rounded-full transition-colors relative ${on ? "bg-brand" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

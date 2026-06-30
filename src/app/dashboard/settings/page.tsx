"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, XCircle, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/useProfile";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

interface NotificationPrefs {
  priceAlerts: boolean;
  dividendReminders: boolean;
  researchReady: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  priceAlerts: true,
  dividendReminders: true,
  researchReady: true,
};

const COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+971", "+65", "+81", "+86", "+49", "+33"];

interface ProvidersStatus {
  upstoxConfigured: boolean;
  upstoxConnected: boolean;
  upstoxExpiresAt: number | null;
  analyticsTokenLoaded: boolean;
  finnhubConfigured: boolean;
}

const UPSTOX_MESSAGES: Record<string, { tone: "up" | "down"; text: string }> = {
  connected: { tone: "up", text: "Live connected successfully." },
  error: { tone: "down", text: "Live connection failed. Check your client ID/secret and redirect URI, then try again." },
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
  const { isPremium, ready: profileReady, maxLists, maxItemsPerList } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [name, setName] = useState(user?.name ?? "");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [providers, setProviders] = useState<ProvidersStatus | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const upstoxMessage = UPSTOX_MESSAGES[searchParams.get("upstox") ?? ""];

  useEffect(() => {
    fetch("/api/upstox/status")
      .then((res) => res.json())
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const prefs = data.user?.user_metadata?.notification_prefs as Partial<NotificationPrefs> | undefined;
      if (prefs) setNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...prefs });
      const metadata = data.user?.user_metadata;
      if (metadata?.phone_country_code) setCountryCode(metadata.phone_country_code as string);
      if (metadata?.phone_number) setPhoneNumber(metadata.phone_number as string);
    });
  }, [supabase]);

  async function handleNotificationPrefChange(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    await supabase.auth.updateUser({ data: { notification_prefs: next } });
  }

  async function handleDisconnectUpstox() {
    await fetch("/api/upstox/disconnect", { method: "POST" });
    setProviders((prev) => (prev ? { ...prev, upstoxConnected: false } : prev));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, phone_country_code: countryCode, phone_number: phoneNumber },
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
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

      {profileReady && (
        <Card>
          <div className="flex items-center gap-4">
            <span
              className={`h-11 w-11 flex-none rounded-xl flex items-center justify-center ${
                isPremium ? "bg-amber-400/15 text-amber-500" : "bg-background text-foreground/40"
              }`}
            >
              <Crown size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-heading">{isPremium ? "Premium" : "Free"} plan</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    isPremium ? "bg-amber-400/15 text-amber-500" : "bg-background text-foreground/40"
                  }`}
                >
                  {isPremium ? "Premium" : "Free"}
                </span>
              </div>
              <p className="text-sm text-foreground/60 mt-1">
                Up to {maxLists} watchlist{maxLists === 1 ? "" : "s"} and portfolio{maxLists === 1 ? "" : "s"}, {maxItemsPerList} stocks each
                {isPremium ? ". Research and Dividends are unlocked." : ". Upgrade to unlock Research and Dividends."}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Market data providers">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-heading">Live</div>
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
                Connect Live
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/40">
                <Circle size={14} /> Not configured
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <div className="text-sm font-semibold text-heading">Analytics</div>
              <div className="text-xs text-foreground/50">App-level token for market data — serves all users without daily OAuth.</div>
            </div>
            {providers?.analyticsTokenLoaded ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-up">
                <CheckCircle2 size={14} /> Loaded
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/40">
                <Circle size={14} /> Not configured
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <div className="text-sm font-semibold text-heading">Fallback</div>
              <div className="text-xs text-foreground/50">Secondary provider — used when Live has no data for a symbol.</div>
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
            Provider order: Live → Analytics → Fallback → mock data. The Live/Mock badge next to prices throughout the app shows which one served each quote.
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
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Phone number</span>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 rounded-lg border border-line bg-surface text-foreground px-2.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="9876543210"
                className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-sm text-up">Saved.</span>}
            {saveError && <span className="text-sm text-down">{saveError}</span>}
          </div>
        </form>
      </Card>

      <Card title="Notifications">
        <div className="space-y-3 text-sm">
          <Toggle
            label="Price alerts for watchlist"
            checked={notificationPrefs.priceAlerts}
            onChange={(value) => handleNotificationPrefChange("priceAlerts", value)}
          />
          {isPremium && (
            <Toggle
              label="Upcoming dividend reminders"
              checked={notificationPrefs.dividendReminders}
              onChange={(value) => handleNotificationPrefChange("dividendReminders", value)}
            />
          )}
          {isPremium && (
            <Toggle
              label="New research report ready"
              checked={notificationPrefs.researchReady}
              onChange={(value) => handleNotificationPrefChange("researchReady", value)}
            />
          )}
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-foreground/70">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex-none w-11 h-6 rounded-full border transition-colors relative outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          checked ? "bg-brand border-brand" : "bg-foreground/15 border-line"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

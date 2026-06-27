"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  Eye,
  Wallet,
  CalendarClock,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useProfile } from "@/lib/useProfile";
import { useNotifications, AppNotification } from "@/lib/useNotifications";
import Link from "next/link";

interface SymbolResult {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
}

const NOTIFICATION_ICONS: Record<AppNotification["category"], typeof Bell> = {
  account: ShieldCheck,
  watchlist: Eye,
  portfolio: Wallet,
  dividend: CalendarClock,
  research: FileText,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { isPremium, ready: profileReady } = useProfile();
  const { theme, toggle: toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when the query is emptied
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const body = await res.json();
        setResults(body.ok ? body.results : []);
      } catch {
        // Aborted or network error — leave the previous results in place.
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <header className="h-16 flex-none border-b border-line bg-surface flex items-center gap-4 px-4 sm:px-6">
      <h1 className="text-base font-semibold text-heading hidden sm:block flex-none">{title}</h1>

      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search NSE / BSE stocks…"
          className="w-full rounded-lg bg-background border border-line pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        {results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 w-full bg-surface border border-line rounded-lg shadow-lg z-30 overflow-hidden">
            {results.map((s) => (
              <Link
                key={`${s.exchange}:${s.symbol}`}
                href={`/dashboard/stocks/${s.symbol}`}
                onClick={() => setQuery("")}
                className="flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-background"
              >
                <span>
                  <span className="font-semibold text-heading">{s.symbol}</span>{" "}
                  <span className="text-foreground/50">{s.name}</span>
                </span>
                <span className="text-foreground/40 text-xs">{s.exchange}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="flex-none h-9 w-9 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground"
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="relative flex-none">
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="relative flex-none h-9 w-9 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-down" />
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded-lg shadow-lg z-30 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
              <span className="text-sm font-semibold text-heading">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3.5 py-6 text-sm text-foreground/50 text-center">No notifications yet.</p>
              ) : (
                notifications.map((n) => {
                  const Icon = NOTIFICATION_ICONS[n.category];
                  return (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`w-full flex items-start gap-3 px-3.5 py-3 text-left border-b border-line last:border-b-0 hover:bg-background ${
                        n.readAt ? "" : "bg-brand/5"
                      }`}
                    >
                      <span className="flex-none h-8 w-8 rounded-full bg-background flex items-center justify-center text-foreground/60">
                        <Icon size={15} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-heading truncate">{n.title}</span>
                          {!n.readAt && <span className="flex-none h-1.5 w-1.5 rounded-full bg-brand" />}
                        </span>
                        {n.body && <span className="block text-xs text-foreground/60 mt-0.5">{n.body}</span>}
                        <span className="block text-xs text-foreground/40 mt-1">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative flex-none">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-background"
        >
          <span className="h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-semibold">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </span>
          <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
            {user?.name ?? "User"}
          </span>
          {profileReady && (
            <span
              className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isPremium ? "bg-amber-400/15 text-amber-500" : "bg-background text-foreground/40"
              }`}
            >
              {isPremium ? "Premium" : "Free"}
            </span>
          )}
          <ChevronDown size={14} className="text-foreground/40" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-line rounded-lg shadow-lg z-30 overflow-hidden">
            <Link
              href="/dashboard/settings"
              onClick={() => setMenuOpen(false)}
              className="block px-3.5 py-2.5 text-sm hover:bg-background"
            >
              Account settings
            </Link>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-down hover:bg-background text-left"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

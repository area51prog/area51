"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Search, ChevronDown, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { STOCKS } from "@/lib/mock-data";
import Link from "next/link";

export default function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const results =
    query.trim().length > 0
      ? STOCKS.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 6)
      : [];

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
                key={s.symbol}
                href={`/dashboard/stocks/${s.symbol}`}
                onClick={() => setQuery("")}
                className="flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-background"
              >
                <span>
                  <span className="font-semibold text-heading">{s.symbol}</span>{" "}
                  <span className="text-foreground/50">{s.name}</span>
                </span>
                <span className="text-foreground/60">₹{s.price.toFixed(2)}</span>
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

      <button className="relative flex-none h-9 w-9 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground">
        <Bell size={17} />
        <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-down" />
      </button>

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

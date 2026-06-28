"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface SymbolResult {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
}

export default function NavSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [focused, setFocused] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) return;
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
  }, [query, user]);

  const showSignInPrompt = focused && !user;
  const showResults = Boolean(user) && results.length > 0;

  return (
    <div className="relative w-44 sm:w-64">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search NSE / BSE stocks…"
        className="w-full rounded-lg bg-surface border border-line pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
      {showSignInPrompt && (
        <div className="absolute top-full mt-1 left-0 w-full bg-surface border border-line rounded-lg shadow-lg z-30 p-3.5 text-xs text-foreground/70 whitespace-nowrap">
          <Link href="/login" className="text-brand font-semibold hover:underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="text-brand font-semibold hover:underline">
            sign up
          </Link>{" "}
          to search stocks
        </div>
      )}
      {showResults && (
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
  );
}

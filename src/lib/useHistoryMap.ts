"use client";

import { useEffect, useState } from "react";
import { CandlePoint } from "@/lib/types";

interface HistoryMapState {
  history: Record<string, CandlePoint[]>;
  loading: boolean;
}

// Module-level cache shared across mounts (e.g. switching tabs back and
// forth) so the chart doesn't re-fetch from the API/DB every time it's
// shown. TTL mirrors the server-side golden-history freshness window in
// upstox.ts, since the underlying data can't change more often than that.
const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000;
const historyCache = new Map<string, { candles: CandlePoint[]; fetchedAt: number }>();

function isFresh(symbol: string): boolean {
  const cached = historyCache.get(symbol);
  return !!cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL_MS;
}

function snapshotFromCache(symbols: string[]): Record<string, CandlePoint[]> {
  const history: Record<string, CandlePoint[]> = {};
  for (const symbol of symbols) {
    const cached = historyCache.get(symbol);
    if (cached) history[symbol] = cached.candles;
  }
  return history;
}

// Fetches the golden 1Y daily history per symbol (backfilling it server-side
// on first request) so client components can compute things like volatility
// off real data instead of reaching into mock-data directly.
export function useHistoryMap(symbols: string[]) {
  const [state, setState] = useState<HistoryMapState>(() => ({
    history: snapshotFromCache(symbols),
    loading: symbols.some((s) => !isFresh(s)),
  }));
  const key = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no symbols means there's nothing to load
      setState({ history: {}, loading: false });
      return;
    }

    const stale = symbols.filter((s) => !isFresh(s));
    if (stale.length === 0) {
      setState({ history: snapshotFromCache(symbols), loading: false });
      return;
    }

    let cancelled = false;
    async function fetchAll() {
      await Promise.all(
        stale.map(async (symbol) => {
          try {
            const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?range=1Y`);
            const data = await res.json();
            const candles = data.ok ? (data.candles as CandlePoint[]) : [];
            historyCache.set(symbol, { candles, fetchedAt: Date.now() });
          } catch {
            historyCache.set(symbol, { candles: [], fetchedAt: Date.now() });
          }
        })
      );
      if (cancelled) return;
      setState({ history: snapshotFromCache(symbols), loading: false });
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable serialized form of `symbols`
  }, [key]);

  return state;
}

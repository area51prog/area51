"use client";

import { useEffect, useState } from "react";
import { CandlePoint } from "@/lib/types";

interface HistoryMapState {
  history: Record<string, CandlePoint[]>;
  loading: boolean;
}

// Fetches the golden 1Y daily history per symbol (backfilling it server-side
// on first request) so client components can compute things like volatility
// off real data instead of reaching into mock-data directly.
export function useHistoryMap(symbols: string[]) {
  const [state, setState] = useState<HistoryMapState>({ history: {}, loading: symbols.length > 0 });
  const key = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no symbols means there's nothing to load
      setState({ history: {}, loading: false });
      return;
    }
    let cancelled = false;
    async function fetchAll() {
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?range=1Y`);
            const data = await res.json();
            return [symbol, data.ok ? (data.candles as CandlePoint[]) : []] as const;
          } catch {
            return [symbol, []] as const;
          }
        })
      );
      if (cancelled) return;
      setState({ history: Object.fromEntries(results), loading: false });
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable serialized form of `symbols`
  }, [key]);

  return state;
}

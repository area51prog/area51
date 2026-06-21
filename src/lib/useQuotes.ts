"use client";

import { useEffect, useState } from "react";
import { LiveQuote, QuoteSource } from "./types";

export type { LiveQuote, QuoteSource };

interface QuotesState {
  quotes: Record<string, LiveQuote | undefined>;
  sources: Record<string, QuoteSource>;
  loading: boolean;
}

const REFRESH_MS = 60_000;

export function useQuotes(symbols: string[]) {
  const [state, setState] = useState<QuotesState>({
    quotes: {},
    sources: {},
    loading: symbols.length > 0,
  });
  const key = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no symbols means there's nothing to load
      setState({ quotes: {}, sources: {}, loading: false });
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      try {
        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setState({ quotes: data.quotes ?? {}, sources: data.sources ?? {}, loading: false });
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable serialized form of `symbols`
  }, [key]);

  return state;
}

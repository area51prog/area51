"use client";

import { useEffect, useState } from "react";
import { getStock } from "./mock-data";
import { Exchange } from "./types";

export type TrendRange = "1D" | "1W" | "1M" | "1Y" | "5Y";

export interface StockSummary {
  symbol: string;
  name: string;
  exchange: Exchange;
  marketCapCr: number | null;
  history: { date: string; price: number }[];
}

export function useStockSummary(symbol: string, range: TrendRange = "1Y") {
  const [summary, setSummary] = useState<StockSummary | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const mock = getStock(symbol);
    if (mock) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from mock data on mount
      setSummary({
        symbol: mock.symbol,
        name: mock.name,
        exchange: mock.exchange,
        marketCapCr: mock.marketCapCr,
        history: mock.history,
      });
      return;
    }

    (async () => {
      try {
        const [lookupRes, historyRes] = await Promise.all([
          fetch(`/api/symbols/lookup?symbol=${encodeURIComponent(symbol)}`),
          fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`),
        ]);
        const lookupBody = await lookupRes.json();
        const historyBody = await historyRes.json();
        if (cancelled) return;

        const instrument = lookupBody.ok ? lookupBody.instrument : null;
        if (!instrument) {
          setSummary(null);
          return;
        }

        const candles = historyBody.ok ? historyBody.candles : [];
        setSummary({
          symbol: instrument.symbol,
          name: instrument.name,
          exchange: instrument.exchange,
          marketCapCr: null,
          history: candles.map((c: { date: string; close: number }) => ({ date: c.date, price: c.close })),
        });
      } catch {
        if (!cancelled) setSummary(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  return summary;
}

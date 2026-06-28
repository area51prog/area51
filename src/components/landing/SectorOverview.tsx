"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Card, Sparkline } from "@/components/ui";

// Upstox's NSE_INDEX segment isn't covered by the equity instrument master
// this app otherwise resolves symbols against, so these are hardcoded using
// the same "NSE_INDEX|<official NSE index name>" convention as the existing
// Nifty 50 key. Unverified against a live Upstox token — if any of these
// don't resolve, the tile below falls back to a no-data state rather than
// guessing numbers.
const INDICES: { key: string; label: string }[] = [
  { key: "NSE_INDEX|Nifty 50", label: "NIFTY 50" },
  { key: "NSE_INDEX|Nifty Bank", label: "NIFTY BANK" },
  { key: "NSE_INDEX|Nifty IT", label: "NIFTY IT" },
  { key: "NSE_INDEX|Nifty Pharma", label: "NIFTY PHARMA" },
  { key: "NSE_INDEX|Nifty Auto", label: "NIFTY AUTO" },
  { key: "NSE_INDEX|Nifty FMCG", label: "NIFTY FMCG" },
];

type Quote = { price: number; changePercent: number | null };

function useIndexQuotes() {
  const [quotes, setQuotes] = useState<Record<string, Quote | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    const keys = INDICES.map((i) => i.key).join(",");
    fetch(`/api/quotes?symbols=${encodeURIComponent(keys)}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled || !body.ok) return;
        setQuotes(body.quotes ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return quotes;
}

function useIndexTrend(key: string) {
  const [values, setValues] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/market-snapshot?symbol=${encodeURIComponent(key)}&range=1M`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        const points: { value: number }[] = body.points ?? [];
        setValues(points.map((p) => p.value));
      })
      .catch(() => {
        if (!cancelled) setValues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return values;
}

function IndexTile({ label, indexKey, quote }: { label: string; indexKey: string; quote?: Quote }) {
  const trend = useIndexTrend(indexKey);
  const up = (quote?.changePercent ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between gap-3 py-3.5 px-1 border-t border-line first:border-t-0">
      <div className="text-sm font-semibold text-heading">{label}</div>
      {trend && trend.length > 1 ? (
        <Sparkline values={trend} color={up ? "var(--color-up)" : "var(--color-down)"} />
      ) : (
        <div className="w-[84px] h-[28px]" />
      )}
      <div className="text-right min-w-[88px]">
        {quote ? (
          <>
            <div className="font-mono text-sm text-heading">{quote.price.toLocaleString("en-IN")}</div>
            {quote.changePercent !== null && (
              <div className={clsx("text-xs font-mono font-semibold", up ? "text-up" : "text-down")}>
                {up ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-foreground/30">—</div>
        )}
      </div>
    </div>
  );
}

export default function SectorOverview() {
  const quotes = useIndexQuotes();

  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-16">
      <Card title="Market and sectors" action={<span className="text-xs text-foreground/50">NSE indices</span>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
          {INDICES.map((index) => (
            <IndexTile key={index.key} label={index.label} indexKey={index.key} quote={quotes[index.key]} />
          ))}
        </div>
      </Card>
    </section>
  );
}

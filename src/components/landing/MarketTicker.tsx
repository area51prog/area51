"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useQuotes } from "@/lib/useQuotes";
import { STOCKS } from "@/lib/mock-data";
import { withLiveQuote } from "@/lib/liveStock";

const SYMBOLS = STOCKS.map((s) => s.symbol);

type IndexTick = { name: string; value: number; changePercent: number };

function useNiftyTick(): IndexTick | null {
  const [tick, setTick] = useState<IndexTick | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market-snapshot")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        const points: { date: string; value: number }[] = body.points ?? [];
        if (points.length < 2) return;
        const first = points[0].value;
        const last = points[points.length - 1].value;
        setTick({
          name: "NIFTY 50",
          value: last,
          changePercent: first ? ((last - first) / first) * 100 : 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return tick;
}

function TickItem({
  label,
  price,
  changePercent,
}: {
  label: string;
  price: string;
  changePercent: number | null;
}) {
  const up = (changePercent ?? 0) >= 0;
  return (
    <span className="inline-flex items-center gap-2.5 px-5 py-2.5 border-r border-white/10 text-xs whitespace-nowrap">
      <b className="font-semibold tracking-wide">{label}</b>
      <span className="text-white/60 font-mono tabular-nums">{price}</span>
      {changePercent !== null && (
        <span className={clsx("font-mono tabular-nums font-semibold", up ? "text-up" : "text-down")}>
          {up ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

export default function MarketTicker() {
  const { quotes } = useQuotes(SYMBOLS);
  const nifty = useNiftyTick();

  const items: { label: string; price: string; changePercent: number | null }[] = [];
  if (nifty) {
    items.push({ label: nifty.name, price: nifty.value.toFixed(2), changePercent: nifty.changePercent });
  }
  for (const stock of STOCKS) {
    const s = withLiveQuote(stock, quotes[stock.symbol]);
    const changePercent = s.prevClose ? ((s.price - s.prevClose) / s.prevClose) * 100 : null;
    items.push({ label: s.symbol, price: `₹${s.price.toFixed(2)}`, changePercent });
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-navy text-white overflow-hidden border-b border-white/10" aria-label="Live market ticker">
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...items, ...items].map((item, i) => (
          <TickItem key={i} label={item.label} price={item.price} changePercent={item.changePercent} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useQuotes } from "@/lib/useQuotes";
import { STOCKS } from "@/lib/mock-data";
import { withLiveQuote } from "@/lib/liveStock";
import { Card, ChangeBadge } from "@/components/ui";
import { LiveQuote } from "@/lib/types";

const SYMBOLS = STOCKS.map((s) => s.symbol);
const NAME_BY_SYMBOL = new Map(STOCKS.map((s) => [s.symbol, s.name]));

type Tab = "gain" | "lose";
type Row = { symbol: string; quote: LiveQuote };

export default function MarketMovers() {
  const { quotes, loading } = useQuotes(SYMBOLS);
  const [tab, setTab] = useState<Tab>("gain");

  const ranked = useMemo(() => {
    const rows: Row[] = STOCKS.map((stock) => {
      const s = withLiveQuote(stock, quotes[stock.symbol]);
      const changePercent = s.prevClose ? ((s.price - s.prevClose) / s.prevClose) * 100 : null;
      return {
        symbol: s.symbol,
        quote: { price: s.price, change: s.price - s.prevClose, changePercent, high: s.dayHigh, low: s.dayLow, prevClose: s.prevClose },
      };
    })
      .filter((r) => r.quote.changePercent !== null)
      .sort((a, b) => b.quote.changePercent! - a.quote.changePercent!);
    return { gain: rows.slice(0, 5), lose: rows.slice(-5).reverse() };
  }, [quotes]);

  const rows = ranked[tab];

  return (
    <Card title="Market movers" action={<span className="text-xs text-foreground/50">Tracked large-caps</span>}>
      <div className="flex items-center gap-1 rounded-lg bg-background/60 p-0.5 mb-2 w-fit">
        {(["gain", "lose"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "text-xs font-semibold px-3 py-1.5 rounded-md transition-colors",
              tab === t ? "bg-brand text-white" : "text-foreground/50 hover:text-foreground"
            )}
          >
            {t === "gain" ? "Gainers" : "Losers"}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-foreground/40">Loading movers…</div>
      ) : rows.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-foreground/40">No data available</div>
      ) : (
        <div className="divide-y divide-line">
          {rows.map(({ symbol, quote }) => (
            <div key={symbol} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-semibold text-heading">{NAME_BY_SYMBOL.get(symbol)}</div>
                <div className="text-[11px] text-foreground/50">{symbol}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-heading">₹{quote!.price.toFixed(2)}</div>
                <ChangeBadge percent={quote!.changePercent!} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

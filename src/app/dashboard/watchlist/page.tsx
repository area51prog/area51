"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trash2, Plus, FileSearch } from "lucide-react";
import { getStock, STOCKS } from "@/lib/mock-data";
import { useWatchlist } from "@/lib/useWatchlist";
import { useQuotes } from "@/lib/useQuotes";
import { withLiveQuote } from "@/lib/liveStock";
import { Card, ChangeBadge, LiveBadge } from "@/components/ui";
import { ListSwitcher } from "@/components/ListSwitcher";

export default function WatchlistPage() {
  const { lists, activeListId, switchList, createList, symbols, ready, remove, add } = useWatchlist();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [addError, setAddError] = useState("");

  const baseStocks = symbols.map((s) => getStock(s)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const { quotes, sources } = useQuotes(baseStocks.map((s) => s.symbol));
  const stocks = baseStocks.map((s) => withLiveQuote(s, quotes[s.symbol]));
  const candidates = STOCKS.filter(
    (s) =>
      !symbols.includes(s.symbol) &&
      (s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))
  );

  if (!ready) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListSwitcher lists={lists} activeId={activeListId} onSwitch={switchList} onCreate={createList} noun="watchlist" />
          <p className="text-sm text-foreground/60">{stocks.length} stocks tracked</p>
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white text-sm font-semibold px-3.5 py-2 hover:bg-brand/90"
        >
          <Plus size={15} /> Add stock
        </button>
      </div>

      {adding && (
        <Card>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks to add…"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand mb-3"
          />
          {addError && <p className="text-sm text-down mb-2">{addError}</p>}
          <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-line">
            {candidates.length === 0 && <p className="text-sm text-foreground/50 py-3">No matches.</p>}
            {candidates.map((s) => (
              <button
                key={s.symbol}
                onClick={async () => {
                  const { error } = await add(s.symbol);
                  setAddError(
                    error
                      ? error.includes("item_limit_exceeded")
                        ? "Your plan's stock limit for this watchlist has been reached. Upgrade to Premium for more."
                        : error
                      : ""
                  );
                  setQuery("");
                }}
                className="w-full flex items-center justify-between py-2.5 text-left hover:bg-background/60 rounded-lg px-2 -mx-2"
              >
                <span>
                  <span className="font-semibold text-heading text-sm">{s.symbol}</span>{" "}
                  <span className="text-foreground/50 text-sm">{s.name}</span>
                </span>
                <span className="text-sm text-foreground/60">₹{s.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        {stocks.length === 0 ? (
          <p className="text-sm text-foreground/50 py-6 text-center">
            Your watchlist is empty. Add stocks to track their price here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                <th className="py-2 font-semibold">Stock</th>
                <th className="py-2 font-semibold text-right">Price</th>
                <th className="py-2 font-semibold text-right">Change</th>
                <th className="py-2 font-semibold text-right hidden md:table-cell">Source</th>
                <th className="py-2 font-semibold text-right hidden sm:table-cell">52w range</th>
                <th className="py-2 font-semibold text-right hidden sm:table-cell">P/E</th>
                <th className="py-2 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stocks.map((s) => {
                const pct = ((s.price - s.prevClose) / s.prevClose) * 100;
                return (
                  <tr key={s.symbol} className="group">
                    <td className="py-3">
                      <Link href={`/dashboard/stocks/${s.symbol}`} className="flex items-center gap-2">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span>
                          <span className="font-semibold text-heading">{s.symbol}</span>
                          <span className="text-foreground/50 ml-2 text-xs">{s.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 text-right font-medium">₹{s.price.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <ChangeBadge percent={pct} />
                    </td>
                    <td className="py-3 text-right hidden md:table-cell">
                      <LiveBadge source={sources[s.symbol]} />
                    </td>
                    <td className="py-3 text-right text-foreground/50 hidden sm:table-cell">
                      ₹{s.week52Low.toFixed(0)} – ₹{s.week52High.toFixed(0)}
                    </td>
                    <td className="py-3 text-right text-foreground/50 hidden sm:table-cell">
                      {s.peRatio?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard/research/${s.symbol}`}
                          className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-brand transition-opacity"
                          title="Research"
                        >
                          <FileSearch size={15} />
                        </Link>
                        <button
                          onClick={() => remove(s.symbol)}
                          className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-down transition-opacity"
                          title="Remove from watchlist"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

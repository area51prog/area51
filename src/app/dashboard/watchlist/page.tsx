"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Star, Trash2, Plus, FileSearch, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { getStock } from "@/lib/mock-data";
import { useWatchlist } from "@/lib/useWatchlist";
import { useQuotes } from "@/lib/useQuotes";
import { withLiveQuote } from "@/lib/liveStock";
import { Exchange, Stock } from "@/lib/types";
import { Card, ChangeBadge, LiveBadge } from "@/components/ui";
import { ListSwitcher } from "@/components/ListSwitcher";

interface SymbolResult {
  symbol: string;
  name: string;
  exchange: Exchange;
}

type SortKey = "symbol" | "price" | "change" | "source" | "week52" | "pe";

const SORT_COLUMNS: { key: SortKey; label: string; align: "left" | "right"; hidden?: string }[] = [
  { key: "symbol", label: "Stock", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "change", label: "Change", align: "right" },
  { key: "source", label: "Source", align: "right", hidden: "hidden md:table-cell" },
  { key: "week52", label: "52w range", align: "right", hidden: "hidden sm:table-cell" },
  { key: "pe", label: "P/E", align: "right", hidden: "hidden sm:table-cell" },
];

export default function WatchlistPage() {
  const { lists, activeListId, switchList, createList, renameList, deleteList, symbols, ready, remove, add } =
    useWatchlist();
  const [adding, setAdding] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [addError, setAddError] = useState("");
  const [candidates, setCandidates] = useState<SymbolResult[]>([]);
  const [info, setInfo] = useState<Record<string, SymbolResult>>({});
  const abortRef = useRef<AbortController | null>(null);
  const fetchedInfoRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when the query is emptied
      setCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = await res.json();
        const results: SymbolResult[] = body.ok ? body.results : [];
        setCandidates(results.filter((r) => !symbols.includes(r.symbol)));
      } catch {
        // Aborted or network error — leave the previous results in place.
      }
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `symbols` is only used to filter already-tracked results
  }, [query]);

  // Stocks added beyond the small built-in mock set need their name/exchange
  // looked up from the live NSE/BSE instrument master.
  const unresolved = symbols.filter((s) => !getStock(s) && !info[s]);
  useEffect(() => {
    const toFetch = unresolved.filter((s) => !fetchedInfoRef.current.has(s));
    if (toFetch.length === 0) return;
    toFetch.forEach((s) => fetchedInfoRef.current.add(s));

    let cancelled = false;
    Promise.all(
      toFetch.map((s) =>
        fetch(`/api/symbols/lookup?symbol=${encodeURIComponent(s)}`)
          .then((res) => res.json())
          .then((body) => ({ symbol: s, instrument: body.ok ? body.instrument : null }))
          .catch(() => ({ symbol: s, instrument: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      setInfo((prev) => {
        const next = { ...prev };
        for (const { symbol, instrument } of results) {
          if (instrument) next[symbol] = instrument;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `unresolved` is derived fresh each render from `symbols`/`info`
  }, [unresolved.join(",")]);

  const baseStocks: Stock[] = symbols.map((s) => {
    const mock = getStock(s);
    if (mock) return mock;
    const resolved = info[s];
    return {
      symbol: s,
      name: resolved?.name ?? s,
      exchange: resolved?.exchange ?? "NSE",
      sector: "—",
      price: 0,
      prevClose: 0,
      dayHigh: 0,
      dayLow: 0,
      week52High: 0,
      week52Low: 0,
      marketCapCr: 0,
      peRatio: null,
      history: [],
    };
  });
  const { quotes, sources } = useQuotes(baseStocks.map((s) => s.symbol));
  const stocks = baseStocks.map((s) => withLiveQuote(s, quotes[s.symbol]));

  const sortedStocks = [...stocks].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "symbol":
        return a.symbol.localeCompare(b.symbol) * dir;
      case "price":
        return (a.price - b.price) * dir;
      case "change": {
        const pctA = a.prevClose ? ((a.price - a.prevClose) / a.prevClose) * 100 : 0;
        const pctB = b.prevClose ? ((b.price - b.prevClose) / b.prevClose) * 100 : 0;
        return (pctA - pctB) * dir;
      }
      case "source":
        return (sources[a.symbol] ?? "").localeCompare(sources[b.symbol] ?? "") * dir;
      case "week52":
        return (a.week52High - b.week52High) * dir;
      case "pe":
        return ((a.peRatio ?? -Infinity) - (b.peRatio ?? -Infinity)) * dir;
      default:
        return 0;
    }
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (!ready) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListSwitcher
            lists={lists}
            activeId={activeListId}
            onSwitch={switchList}
            onCreate={createList}
            onRename={renameList}
            onDelete={deleteList}
            noun="watchlist"
          />
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
                  if (!error) setInfo((prev) => ({ ...prev, [s.symbol]: s }));
                  setQuery("");
                }}
                className="w-full flex items-center justify-between py-2.5 text-left hover:bg-background/60 rounded-lg px-2 -mx-2"
              >
                <span>
                  <span className="font-semibold text-heading text-sm">{s.symbol}</span>{" "}
                  <span className="text-foreground/50 text-sm">{s.name}</span>
                </span>
                <span className="text-xs text-foreground/40">{s.exchange}</span>
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
                {SORT_COLUMNS.map((col) => (
                  <th key={col.key} className={clsx("py-2 font-semibold", col.align === "right" && "text-right", col.hidden)}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className={clsx(
                        "inline-flex items-center gap-1 hover:text-foreground/70",
                        col.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-30" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="py-2 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedStocks.map((s) => {
                const pct = s.prevClose ? ((s.price - s.prevClose) / s.prevClose) * 100 : 0;
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
                    <td className="py-3 text-right font-medium">{s.price ? `₹${s.price.toFixed(2)}` : "—"}</td>
                    <td className="py-3 text-right">
                      <ChangeBadge percent={pct} />
                    </td>
                    <td className="py-3 text-right hidden md:table-cell">
                      <LiveBadge source={sources[s.symbol]} />
                    </td>
                    <td className="py-3 text-right text-foreground/50 hidden sm:table-cell">
                      {s.week52High ? `₹${s.week52Low.toFixed(0)} – ₹${s.week52High.toFixed(0)}` : "—"}
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

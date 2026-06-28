"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Upload, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getStock } from "@/lib/mock-data";
import { usePortfolio, SUMMARY_ID, Position, NewHolding } from "@/lib/usePortfolio";
import { useProfile } from "@/lib/useProfile";
import { useQuotes } from "@/lib/useQuotes";
import { useTransactions, Transaction } from "@/lib/useTransactions";
import { useAllGeneratedReports } from "@/lib/useResearch";
import { withLiveQuote } from "@/lib/liveStock";
import { Exchange, Stock } from "@/lib/types";
import { formatINR, formatINRCompact, formatDate } from "@/lib/format";
import { Card, ChangeBadge, LiveBadge, RatingDot, Stat } from "@/components/ui";
import { ListSwitcher } from "@/components/ListSwitcher";
import { parseCsv, validateBulkRows, bulkUploadTemplate, BulkRowError } from "@/lib/csv";

const COLORS = ["#1a2348", "#4f46e5", "#7c83e8", "#a5abf2", "#c8ccf8", "#15803d"];

interface SymbolResult {
  symbol: string;
  name: string;
  exchange: Exchange;
}

type SortKey = "symbol" | "quantity" | "avgPrice" | "ltp" | "dayChange" | "value" | "gain";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "symbol", label: "Stock" },
  { key: "quantity", label: "Qty" },
  { key: "avgPrice", label: "Avg. cost" },
  { key: "ltp", label: "LTP" },
  { key: "dayChange", label: "Day change" },
  { key: "value", label: "Current value" },
  { key: "gain", label: "P&L" },
];

export default function PortfolioPage() {
  const {
    lists,
    activePortfolioId,
    isSummary,
    switchPortfolio,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    positions,
    ready,
    buyHolding,
    bulkAddHoldings,
    sellHolding,
    deletePosition,
  } = usePortfolio();
  const { isPremium } = useProfile();
  const { quotes, sources } = useQuotes(positions.map((p) => p.symbol));
  const { transactions } = useTransactions();
  const reports = useAllGeneratedReports();
  const [adding, setAdding] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [buySellIntent, setBuySellIntent] = useState<{ symbol: string; side: "buy" | "sell" } | null>(null);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [info, setInfo] = useState<Record<string, SymbolResult>>({});
  const fetchedInfoRef = useRef<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleExpand(symbol: string) {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  // Close any open Add / Buy-Sell form and reset row expansion/sort defaults when the selected
  // portfolio changes (incl. switching to/from Summary) — those forms act on a specific
  // portfolio and shouldn't linger, and holdings always default to sorting by Stock A-Z.
  const [prevPortfolioId, setPrevPortfolioId] = useState(activePortfolioId);
  if (activePortfolioId !== prevPortfolioId) {
    setPrevPortfolioId(activePortfolioId);
    setAdding(false);
    setBulkUploading(false);
    setBuySellIntent(null);
    setExpandedSymbols(new Set());
    setSortKey("symbol");
    setSortDir("asc");
  }

  // Holdings in stocks beyond the small built-in mock set need their name/exchange
  // looked up from the live NSE/BSE instrument master.
  const unresolved = positions.map((p) => p.symbol).filter((s) => !getStock(s) && !info[s]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `unresolved` is derived fresh each render from `positions`/`info`
  }, [unresolved.join(",")]);

  const rows = positions.map((p) => {
    const mock = getStock(p.symbol);
    const resolved = info[p.symbol];
    const baseStock: Stock | null = mock
      ? mock
      : resolved
        ? {
            symbol: p.symbol,
            name: resolved.name,
            exchange: resolved.exchange,
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
          }
        : null;
    const s = baseStock ? withLiveQuote(baseStock, quotes[p.symbol]) : null;
    const priceKnown = Boolean(s && s.price > 0);
    const invested = p.avgPrice * p.quantity;
    const value = (priceKnown ? s!.price : p.avgPrice) * p.quantity;
    const gain = value - invested;
    const gainPct = invested ? (gain / invested) * 100 : 0;
    const dayChangePct = priceKnown ? ((s!.price - s!.prevClose) / s!.prevClose) * 100 : 0;
    const dayPnl = priceKnown ? (s!.price - s!.prevClose) * p.quantity : 0;
    return { p, s, priceKnown, invested, value, gain, gainPct, dayChangePct, dayPnl };
  });

  const sortedRows = [...rows].sort((a, b) => {
    let diff = 0;
    switch (sortKey) {
      case "symbol":
        diff = a.p.symbol.localeCompare(b.p.symbol);
        break;
      case "quantity":
        diff = a.p.quantity - b.p.quantity;
        break;
      case "avgPrice":
        diff = a.p.avgPrice - b.p.avgPrice;
        break;
      case "ltp":
        diff = (a.priceKnown ? a.s!.price : -1) - (b.priceKnown ? b.s!.price : -1);
        break;
      case "dayChange":
        diff = a.dayChangePct - b.dayChangePct;
        break;
      case "value":
        diff = a.value - b.value;
        break;
      case "gain":
        diff = a.gain - b.gain;
        break;
    }
    return sortDir === "asc" ? diff : -diff;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
  const totalGain = totalValue - totalInvested;
  const totalDayPnl = rows.reduce((sum, r) => sum + r.dayPnl, 0);

  const allocationRaw = rows
    .map((r) => ({ name: r.p.symbol, value: r.value }))
    .sort((a, b) => b.value - a.value);
  const { major, others } = allocationRaw.reduce<{ major: typeof allocationRaw; others: typeof allocationRaw }>(
    (acc, d) => {
      const pct = totalValue ? (d.value / totalValue) * 100 : 0;
      (pct < 5 ? acc.others : acc.major).push(d);
      return acc;
    },
    { major: [], others: [] }
  );
  const pieData =
    others.length > 1
      ? [...major, { name: "Others", value: others.reduce((sum, d) => sum + d.value, 0) }]
      : allocationRaw;

  const switcherLists =
    isPremium && lists.length > 1 ? [{ id: SUMMARY_ID, name: "All Portfolios" }, ...lists] : lists;

  if (!ready) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <ListSwitcher
          lists={switcherLists}
          activeId={activePortfolioId}
          onSwitch={switchPortfolio}
          onCreate={createPortfolio}
          onRename={renamePortfolio}
          onDelete={deletePortfolio}
          noun="portfolio"
        />
        {!isSummary && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkUploading((a) => !a)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line text-sm font-semibold px-3.5 py-2 hover:bg-background"
            >
              <Upload size={15} /> Upload CSV
            </button>
            <button
              type="button"
              onClick={() => setAdding((a) => !a)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white text-sm font-semibold px-3.5 py-2 hover:bg-brand/90"
            >
              <Plus size={15} /> Add holding
            </button>
          </div>
        )}
      </div>

      {adding && (
        <AddHoldingForm
          onAdd={bulkAddHoldings}
          onDone={() => setAdding(false)}
        />
      )}

      {bulkUploading && (
        <BulkUploadForm
          onUpload={bulkAddHoldings}
          onDone={() => setBulkUploading(false)}
        />
      )}

      {positions.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/50 py-10 text-center">
            Your portfolio is empty. Add a holding to start tracking gains, allocation, and dividends.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Allocation" className="lg:col-span-1">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINRCompact(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 text-xs">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-foreground/60">{d.name}</span>
                    <span className="ml-auto font-medium">{((d.value / totalValue) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-line h-full gap-4 sm:gap-0">
                <Stat label="Current value" value={formatINRCompact(totalValue)} />
                <Stat label="Total invested" value={formatINRCompact(totalInvested)} />
                <Stat
                  label="Day P&L"
                  value={`${totalDayPnl >= 0 ? "+" : ""}${formatINRCompact(totalDayPnl)}`}
                  tone={totalDayPnl >= 0 ? "up" : "down"}
                  sub={`${((totalDayPnl / (totalValue - totalDayPnl || 1)) * 100).toFixed(2)}%`}
                />
                <Stat
                  label="Total P&L"
                  value={`${totalGain >= 0 ? "+" : ""}${formatINRCompact(totalGain)}`}
                  tone={totalGain >= 0 ? "up" : "down"}
                  sub={`${((totalGain / (totalInvested || 1)) * 100).toFixed(2)}%`}
                />
              </div>
            </Card>
          </div>

          <Card
            title="Holdings"
            action={
              <LiveBadge source={rows.map((r) => sources[r.p.symbol]).find((s) => s && s !== "mock") ?? "mock"} />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                    {!isSummary && <th className="py-2 w-6"></th>}
                    {SORT_COLUMNS.map((col, i) => (
                      <th key={col.key} className={`py-2 font-semibold ${i === 0 ? "" : "text-right"}`}>
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={`inline-flex items-center gap-1 hover:text-foreground/70 ${i === 0 ? "" : "flex-row-reverse"}`}
                        >
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            )
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </button>
                      </th>
                    ))}
                    {!isSummary && <th className="py-2 font-semibold text-right"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sortedRows.map((r) => {
                    const expanded = expandedSymbols.has(r.p.symbol);
                    return (
                      <Fragment key={r.p.symbol}>
                        <tr className="group">
                          {!isSummary && (
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => toggleExpand(r.p.symbol)}
                                className="text-foreground/40 hover:text-foreground/70"
                                title={expanded ? "Hide transaction history" : "Show transaction history"}
                              >
                                <ChevronRight size={16} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                              </button>
                            </td>
                          )}
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <Link href={`/dashboard/stocks/${r.p.symbol}`} className="font-semibold text-heading hover:text-brand">
                                {r.p.symbol}
                              </Link>
                              {reports[r.p.symbol] && <RatingDot rating={reports[r.p.symbol].rating} />}
                            </span>
                            <div className="text-xs text-foreground/50">{r.s?.name ?? "Unknown stock"}</div>
                          </td>
                          <td className="py-3 text-right">{r.p.quantity}</td>
                          <td className="py-3 text-right">₹{formatINR(r.p.avgPrice)}</td>
                          <td className="py-3 text-right">{r.priceKnown ? `₹${formatINR(r.s!.price)}` : "—"}</td>
                          <td className="py-3 text-right">{r.priceKnown && <ChangeBadge percent={r.dayChangePct} />}</td>
                          <td className="py-3 text-right font-medium">{formatINRCompact(r.value)}</td>
                          <td className={`py-3 text-right font-semibold ${r.gain >= 0 ? "text-up" : "text-down"}`}>
                            {r.gain >= 0 ? "+" : ""}
                            {formatINRCompact(r.gain)}
                            <span className="block text-xs font-normal">{r.gainPct.toFixed(2)}%</span>
                          </td>
                          {!isSummary && (
                            <td className="py-3 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => deletePosition(r.p.symbol)}
                                  className="text-foreground/40 hover:text-down"
                                  title="Delete holding"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                        {!isSummary && (
                          <tr>
                            <td colSpan={SORT_COLUMNS.length + 2} className="p-0">
                              <div
                                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                                  expanded ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
                                }`}
                              >
                                <HoldingTransactionPanel
                                  symbol={r.p.symbol}
                                  currentPrice={r.priceKnown ? r.s!.price : null}
                                  transactions={transactions.filter(
                                    (t) => t.portfolioId === activePortfolioId && t.symbol === r.p.symbol
                                  )}
                                  onBuy={() => setBuySellIntent({ symbol: r.p.symbol, side: "buy" })}
                                  onSell={() => setBuySellIntent({ symbol: r.p.symbol, side: "sell" })}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {buySellIntent && (
        <BuySellForm
          symbol={buySellIntent.symbol}
          initialSide={buySellIntent.side}
          position={positions.find((p) => p.symbol === buySellIntent.symbol) ?? null}
          onBuy={buyHolding}
          onSell={sellHolding}
          onDone={() => setBuySellIntent(null)}
        />
      )}
    </div>
  );
}

function HoldingTransactionPanel({
  symbol,
  currentPrice,
  transactions,
  onBuy,
  onSell,
}: {
  symbol: string;
  currentPrice: number | null;
  transactions: Transaction[];
  onBuy: () => void;
  onSell: () => void;
}) {
  const sorted = [...transactions].sort((a, b) => b.txnDate.localeCompare(a.txnDate));

  return (
    <div className="p-4 bg-background/40 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[760px]">
          <thead>
            <tr className="text-left text-foreground/40 uppercase tracking-wide border-b border-line">
              <th className="py-1.5 pr-3 font-semibold">Stock</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Quantity</th>
              <th className="py-1.5 pr-3 font-semibold">Trade date</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Trade price</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Trade amount</th>
              <th className="py-1.5 pr-3 font-semibold text-right">Overall gain</th>
              <th className="py-1.5 font-semibold text-right">Overall gain (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-3 text-center text-foreground/40">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              sorted.map((t) => {
                const amount = t.quantity * t.price;
                const gain = t.side === "sell" ? t.realizedPnl : currentPrice !== null ? (currentPrice - t.price) * t.quantity : null;
                const gainPct = gain !== null && amount ? (gain / amount) * 100 : null;
                return (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 font-semibold text-heading">{symbol}</td>
                    <td className="py-2 pr-3 text-right">
                      {t.side === "sell" ? "-" : ""}
                      {t.quantity}
                    </td>
                    <td className="py-2 pr-3">{formatDate(t.txnDate)}</td>
                    <td className="py-2 pr-3 text-right">₹{formatINR(t.price)}</td>
                    <td className="py-2 pr-3 text-right">{formatINRCompact(amount)}</td>
                    <td className={`py-2 pr-3 text-right font-medium ${gain === null ? "text-foreground/40" : gain >= 0 ? "text-up" : "text-down"}`}>
                      {gain === null ? "—" : `${gain >= 0 ? "+" : ""}${formatINRCompact(gain)}`}
                    </td>
                    <td className={`py-2 text-right font-medium ${gainPct === null ? "text-foreground/40" : gainPct >= 0 ? "text-up" : "text-down"}`}>
                      {gainPct === null ? "—" : `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)}%`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBuy}
          className="rounded-lg bg-up text-white text-sm font-semibold px-4 py-2 hover:bg-up/90"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={onSell}
          className="rounded-lg bg-down text-white text-sm font-semibold px-4 py-2 hover:bg-down/90"
        >
          Sell
        </button>
      </div>
    </div>
  );
}

let holdingRowSeq = 0;

interface HoldingRowState {
  id: number;
  symbol: string;
  name: string;
  quantity: string;
  avgPrice: string;
  buyDate: string;
}

function newHoldingRow(): HoldingRowState {
  return {
    id: ++holdingRowSeq,
    symbol: "",
    name: "",
    quantity: "",
    avgPrice: "",
    buyDate: new Date().toISOString().slice(0, 10),
  };
}

function AddHoldingForm({
  onAdd,
  onDone,
}: {
  onAdd: (inputs: NewHolding[]) => Promise<{ inserted: number; error?: string }>;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<HoldingRowState[]>(() => [newHoldingRow()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateRow(id: number, patch: Partial<HoldingRowState>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inputs: NewHolding[] = [];
    for (const r of rows) {
      const qty = Number(r.quantity);
      const price = Number(r.avgPrice);
      if (!r.symbol || !qty || qty <= 0 || !price || price < 0 || !r.buyDate) {
        setError("Search for and select a stock for every row, then enter a valid quantity, average price, and buy date.");
        return;
      }
      inputs.push({ symbol: r.symbol, quantity: qty, avgPrice: price, buyDate: r.buyDate });
    }
    setError("");
    setSubmitting(true);
    const { error: addError } = await onAdd(inputs);
    setSubmitting(false);
    if (addError) {
      setError(addError);
      return;
    }
    onDone();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <HoldingStockSearch
              symbol={row.symbol}
              name={row.name}
              onSelect={(symbol, name) => updateRow(row.id, { symbol, name })}
              onClear={() => updateRow(row.id, { symbol: "", name: "" })}
            />
            <label className="block">
              <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Quantity</span>
              <input
                type="number"
                min="1"
                step="1"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                placeholder="e.g. 25"
                className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Avg. price (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.avgPrice}
                onChange={(e) => updateRow(row.id, { avgPrice: e.target.value })}
                placeholder="e.g. 1295.40"
                className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Buy date</span>
              <input
                type="date"
                value={row.buyDate}
                onChange={(e) => updateRow(row.id, { buyDate: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </label>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              title="Remove row"
              className="text-foreground/40 hover:text-down disabled:opacity-30 disabled:hover:text-foreground/40 mb-2.5 sm:mb-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, newHoldingRow()])}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <Plus size={14} /> Add another row
        </button>

        {error && <p className="text-sm text-down">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 disabled:opacity-60"
          >
            {submitting ? "Adding…" : rows.length > 1 ? `Add ${rows.length} holdings` : "Add holding"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-line text-sm font-semibold px-4 py-2 hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function HoldingStockSearch({
  symbol,
  name,
  onSelect,
  onClear,
}: {
  symbol: string;
  name: string;
  onSelect: (symbol: string, name: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SymbolResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

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
        setCandidates(body.ok ? body.results : []);
      } catch {
        // Aborted or network error — leave the previous results in place.
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <label className="block relative">
      <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Stock</span>
      <input
        value={symbol ? `${symbol} — ${name}` : query}
        onChange={(e) => {
          onClear();
          setQuery(e.target.value);
        }}
        placeholder="Search stocks to add…"
        className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
      {!symbol && candidates.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-full bg-surface border border-line rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto">
          {candidates.map((c) => (
            <button
              key={c.symbol}
              type="button"
              onClick={() => {
                onSelect(c.symbol, c.name);
                setQuery("");
                setCandidates([]);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-background text-left"
            >
              <span>
                <span className="font-semibold text-heading">{c.symbol}</span>{" "}
                <span className="text-foreground/50">{c.name}</span>
              </span>
              <span className="text-foreground/40 text-xs">{c.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function BulkUploadForm({
  onUpload,
  onDone,
}: {
  onUpload: (inputs: NewHolding[]) => Promise<{ inserted: number; error?: string }>;
  onDone: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [validRows, setValidRows] = useState<NewHolding[]>([]);
  const [rowErrors, setRowErrors] = useState<BulkRowError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; error?: string } | null>(null);

  function handleDownloadTemplate() {
    const blob = new Blob([bulkUploadTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "holdings-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const { valid, errors } = validateBulkRows(parseCsv(text));
    setValidRows(valid);
    setRowErrors(errors);
  }

  async function handleSubmit() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    const outcome = await onUpload(validRows);
    setSubmitting(false);
    setResult(outcome);
    if (!outcome.error) {
      setValidRows([]);
      setRowErrors([]);
      setFileName("");
    }
  }

  return (
    <Card title="Bulk upload holdings">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-line text-sm font-semibold px-3.5 py-2 hover:bg-background cursor-pointer">
            <Upload size={15} /> Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
          </label>
          {fileName && <span className="text-sm text-foreground/60">{fileName}</span>}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Download template
          </button>
        </div>

        {(validRows.length > 0 || rowErrors.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                  <th className="py-2 font-semibold">Row</th>
                  <th className="py-2 font-semibold">Symbol</th>
                  <th className="py-2 font-semibold text-right">Qty</th>
                  <th className="py-2 font-semibold text-right">Avg. price</th>
                  <th className="py-2 font-semibold">Buy date</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {validRows.map((r, i) => (
                  <tr key={`valid-${i}`}>
                    <td className="py-2">{i + 2}</td>
                    <td className="py-2 font-medium">{r.symbol}</td>
                    <td className="py-2 text-right">{r.quantity}</td>
                    <td className="py-2 text-right">₹{formatINR(r.avgPrice)}</td>
                    <td className="py-2">{r.buyDate}</td>
                    <td className="py-2 text-up">✓ Ready</td>
                  </tr>
                ))}
                {rowErrors.map((e, i) => (
                  <tr key={`error-${i}`}>
                    <td className="py-2">{e.row || "—"}</td>
                    <td className="py-2" colSpan={4}>
                      —
                    </td>
                    <td className="py-2 text-down">✗ {e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <p className={`text-sm ${result.error ? "text-down" : "text-up"}`}>
            {result.error ? result.error : `Uploaded ${result.inserted} holding${result.inserted === 1 ? "" : "s"}.`}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || validRows.length === 0}
            className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 disabled:opacity-60"
          >
            {submitting ? "Uploading…" : `Upload ${validRows.length} holding${validRows.length === 1 ? "" : "s"}`}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-line text-sm font-semibold px-4 py-2 hover:bg-background"
          >
            Close
          </button>
        </div>
      </div>
    </Card>
  );
}

function BuySellForm({
  symbol,
  position,
  initialSide = "buy",
  onBuy,
  onSell,
  onDone,
}: {
  symbol: string;
  position: Position | null;
  initialSide?: "buy" | "sell";
  onBuy: (input: { symbol: string; quantity: number; avgPrice: number; buyDate: string }) => Promise<{ error?: string }>;
  onSell: (symbol: string, quantity: number, price: number, sellDate: string) => Promise<{ error?: string }>;
  onDone: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">(initialSide);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    const priceValue = Number(price);
    if (!priceValue || priceValue < 0 || !date) {
      setError(`Enter a valid ${side} price and ${side} date.`);
      return;
    }
    setError("");
    setSubmitting(true);
    if (side === "buy") {
      const { error: buyError } = await onBuy({ symbol, quantity: qty, avgPrice: priceValue, buyDate: date });
      setSubmitting(false);
      if (buyError) {
        setError(buyError);
        return;
      }
    } else {
      const { error: sellError } = await onSell(symbol, qty, priceValue, date);
      setSubmitting(false);
      if (sellError) {
        setError(sellError);
        return;
      }
    }
    onDone();
  }

  return (
    <Card title={`${symbol} — Buy / Sell`}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Action</span>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as "buy" | "sell")}
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">
            Quantity {position && side === "sell" ? `(held: ${position.quantity})` : ""}
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 10"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">
            {side === "buy" ? "Buy" : "Sell"} price (₹)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 1295.40"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">
            {side === "buy" ? "Buy" : "Sell"} date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </label>
        {error && <p className="text-sm text-down sm:col-span-4">{error}</p>}
        <div className="sm:col-span-4 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : side === "buy" ? "Buy" : "Sell"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-line text-sm font-semibold px-4 py-2 hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

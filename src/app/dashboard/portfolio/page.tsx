"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getStock, STOCKS } from "@/lib/mock-data";
import { usePortfolio, SUMMARY_ID, Position } from "@/lib/usePortfolio";
import { useProfile } from "@/lib/useProfile";
import { useQuotes } from "@/lib/useQuotes";
import { withLiveQuote } from "@/lib/liveStock";
import { formatINR, formatINRCompact } from "@/lib/format";
import { Card, ChangeBadge, LiveBadge } from "@/components/ui";
import { ListSwitcher } from "@/components/ListSwitcher";

const COLORS = ["#1a2348", "#4f46e5", "#7c83e8", "#a5abf2", "#c8ccf8", "#15803d"];

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
    sellHolding,
    deletePosition,
  } = usePortfolio();
  const { isPremium } = useProfile();
  const { quotes, sources } = useQuotes(positions.map((p) => p.symbol));
  const [adding, setAdding] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);

  // Close any open Add / Buy-Sell form when the selected portfolio changes (incl. switching
  // to/from Summary) — those forms act on a specific portfolio and shouldn't linger.
  const [prevPortfolioId, setPrevPortfolioId] = useState(activePortfolioId);
  if (activePortfolioId !== prevPortfolioId) {
    setPrevPortfolioId(activePortfolioId);
    setAdding(false);
    setEditingSymbol(null);
  }

  const rows = positions.map((p) => {
    const baseStock = getStock(p.symbol);
    const s = baseStock ? withLiveQuote(baseStock, quotes[p.symbol]) : null;
    const invested = p.avgPrice * p.quantity;
    const value = (s?.price ?? p.avgPrice) * p.quantity;
    const gain = value - invested;
    const gainPct = invested ? (gain / invested) * 100 : 0;
    const dayChangePct = s ? ((s.price - s.prevClose) / s.prevClose) * 100 : 0;
    const dayPnl = s ? (s.price - s.prevClose) * p.quantity : 0;
    return { p, s, invested, value, gain, gainPct, dayChangePct, dayPnl };
  });

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
  const totalGain = totalValue - totalInvested;
  const totalDayPnl = rows.reduce((sum, r) => sum + r.dayPnl, 0);

  const pieData = rows
    .map((r) => ({ name: r.p.symbol, value: r.value }))
    .sort((a, b) => b.value - a.value);

  const switcherLists =
    isPremium && lists.length > 1 ? [{ id: SUMMARY_ID, name: "Summary" }, ...lists] : lists;

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
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white text-sm font-semibold px-3.5 py-2 hover:bg-brand/90"
          >
            <Plus size={15} /> Add holding
          </button>
        )}
      </div>

      {adding && (
        <AddHoldingForm
          onAdd={buyHolding}
          onDone={() => setAdding(false)}
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
                    <th className="py-2 font-semibold">Stock</th>
                    <th className="py-2 font-semibold text-right">Qty</th>
                    <th className="py-2 font-semibold text-right">Avg. cost</th>
                    <th className="py-2 font-semibold text-right">LTP</th>
                    <th className="py-2 font-semibold text-right">Day change</th>
                    <th className="py-2 font-semibold text-right">Current value</th>
                    <th className="py-2 font-semibold text-right">P&amp;L</th>
                    {!isSummary && <th className="py-2 font-semibold text-right"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.p.symbol} className="group">
                      <td className="py-3">
                        <Link href={`/dashboard/stocks/${r.p.symbol}`} className="font-semibold text-heading hover:text-brand">
                          {r.p.symbol}
                        </Link>
                        <div className="text-xs text-foreground/50">{r.s?.name ?? "Unknown stock"}</div>
                      </td>
                      <td className="py-3 text-right">{r.p.quantity}</td>
                      <td className="py-3 text-right">₹{formatINR(r.p.avgPrice)}</td>
                      <td className="py-3 text-right">{r.s ? `₹${formatINR(r.s.price)}` : "—"}</td>
                      <td className="py-3 text-right">{r.s && <ChangeBadge percent={r.dayChangePct} />}</td>
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
                              onClick={() => setEditingSymbol(r.p.symbol)}
                              className="text-foreground/40 hover:text-brand"
                              title="Buy / Sell"
                            >
                              <Pencil size={15} />
                            </button>
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
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {editingSymbol && (
        <BuySellForm
          symbol={editingSymbol}
          position={positions.find((p) => p.symbol === editingSymbol) ?? null}
          onBuy={buyHolding}
          onSell={sellHolding}
          onDone={() => setEditingSymbol(null)}
        />
      )}
    </div>
  );
}

function AddHoldingForm({
  onAdd,
  onDone,
}: {
  onAdd: (input: { symbol: string; quantity: number; avgPrice: number; buyDate: string }) => Promise<{ error?: string }>;
  onDone: () => void;
}) {
  const [symbol, setSymbol] = useState(STOCKS[0]?.symbol ?? "");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    const price = Number(avgPrice);
    if (!symbol || !qty || qty <= 0 || !price || price < 0 || !buyDate) {
      setError("Enter a valid quantity, average price, and buy date.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: addError } = await onAdd({ symbol, quantity: qty, avgPrice: price, buyDate });
    setSubmitting(false);
    if (addError) {
      setError(addError);
      return;
    }
    onDone();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Stock</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          >
            {STOCKS.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Quantity</span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
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
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            placeholder="e.g. 1295.40"
            className="w-full rounded-lg border border-line bg-surface text-foreground px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Buy date</span>
          <input
            type="date"
            value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)}
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
            {submitting ? "Adding…" : "Add holding"}
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

function BuySellForm({
  symbol,
  position,
  onBuy,
  onSell,
  onDone,
}: {
  symbol: string;
  position: Position | null;
  onBuy: (input: { symbol: string; quantity: number; avgPrice: number; buyDate: string }) => Promise<{ error?: string }>;
  onSell: (symbol: string, quantity: number, price: number, sellDate: string) => Promise<{ error?: string }>;
  onDone: () => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
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

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="px-4 first:pl-0 flex flex-col justify-center">
      <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-heading"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-foreground/50 mt-0.5">{sub}</div>}
    </div>
  );
}

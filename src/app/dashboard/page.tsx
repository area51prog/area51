"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usePortfolio } from "@/lib/usePortfolio";
import { useWatchlist } from "@/lib/useWatchlist";
import { getStock } from "@/lib/mock-data";
import { useQuotes } from "@/lib/useQuotes";
import { withLiveQuote } from "@/lib/liveStock";
import { formatDate, formatINRCompact } from "@/lib/format";
import { Card, ChangeBadge, LiveBadge, PriceAreaChart } from "@/components/ui";
import { ArrowUpRight, Wallet, FileSearch } from "lucide-react";

export default function OverviewPage() {
  const { user } = useAuth();
  const { holdings, ready: portfolioReady } = usePortfolio();
  const { symbols: watchlistSymbols, ready: watchlistReady } = useWatchlist();
  const { quotes, sources } = useQuotes(holdings.map((h) => h.symbol));

  const rows = holdings
    .map((h) => {
      const baseStock = getStock(h.symbol);
      if (!baseStock) return null;
      const s = withLiveQuote(baseStock, quotes[h.symbol]);
      const invested = h.avgPrice * h.quantity;
      const value = s.price * h.quantity;
      const dayChange = (s.price - s.prevClose) * h.quantity;
      return { h, s, invested, value, dayChange };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalDayChange = rows.reduce((sum, r) => sum + r.dayChange, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested ? (totalGain / totalInvested) * 100 : 0;
  const dayChangePct = totalValue - totalDayChange ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

  const benchmarkHistory = getStock("RELIANCE")!.history;

  const recentActivity = [...holdings]
    .sort((a, b) => b.buyDate.localeCompare(a.buyDate))
    .slice(0, 5)
    .map((h) => ({ id: h.id, symbol: h.symbol, date: h.buyDate, amount: h.avgPrice * h.quantity, quantity: h.quantity }));

  if (!portfolioReady || !watchlistReady) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-heading">Welcome back, {user?.name?.split(" ")[0] ?? "Investor"}</h2>
        <p className="text-sm text-foreground/60 mt-0.5">Here&apos;s how your portfolio is doing today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <span className="flex items-center gap-2"><Wallet size={14} /> Portfolio value</span>
            {rows.length > 0 && (
              <LiveBadge source={rows.map((r) => sources[r.h.symbol]).find((s) => s && s !== "mock") ?? "mock"} />
            )}
          </div>
          <div className="text-2xl font-bold text-heading mt-2">{formatINRCompact(totalValue)}</div>
          <div className="mt-1"><ChangeBadge percent={dayChangePct} value={totalDayChange} /></div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">Total invested</div>
          <div className="text-2xl font-bold text-heading mt-2">{formatINRCompact(totalInvested)}</div>
          <div className="text-xs text-foreground/50 mt-1">{rows.length} holdings</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">Total gain / loss</div>
          <div className={`text-2xl font-bold mt-2 ${totalGain >= 0 ? "text-up" : "text-down"}`}>
            {totalGain >= 0 ? "+" : ""}
            {formatINRCompact(totalGain)}
          </div>
          <div className="mt-1"><ChangeBadge percent={totalGainPct} /></div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">Watchlist</div>
          <div className="text-2xl font-bold text-heading mt-2">{watchlistSymbols.length} stocks</div>
          <Link href="/dashboard/watchlist" className="text-xs text-brand font-medium hover:underline mt-1 inline-block">
            View watchlist →
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Market snapshot — Reliance Industries" className="lg:col-span-2">
          <PriceAreaChart data={benchmarkHistory} />
        </Card>
        <Card title="Run equity research" className="flex flex-col">
          <p className="text-sm text-foreground/60 flex-1">
            Get an AI-generated equity research report — rating, target price, scenarios and risks — for any stock in seconds.
          </p>
          <Link
            href="/dashboard/research"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand/90 transition-colors"
          >
            <FileSearch size={16} />
            Go to Research
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Top holdings" className="lg:col-span-2" action={<Link href="/dashboard/portfolio" className="text-xs text-brand font-medium hover:underline">See all</Link>}>
          {rows.length === 0 ? (
            <p className="text-sm text-foreground/50 py-6 text-center">
              No holdings yet. <Link href="/dashboard/portfolio" className="text-brand font-medium hover:underline">Add one</Link> to see it here.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {rows
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
                .map(({ h, s, value }) => {
                  const pct = ((s.price - s.prevClose) / s.prevClose) * 100;
                  return (
                    <Link
                      key={h.id}
                      href={`/dashboard/stocks/${h.symbol}`}
                      className="flex items-center justify-between py-3 hover:bg-background/60 rounded-lg px-2 -mx-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-heading">{s.symbol}</div>
                        <div className="text-xs text-foreground/50">{h.quantity} shares</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatINRCompact(value)}</div>
                        <ChangeBadge percent={pct} />
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </Card>

        <Card title="Recent activity">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-foreground/50 py-6 text-center">
              No activity yet. Add a holding to your portfolio to see it here.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <span className="flex-none h-8 w-8 rounded-full flex items-center justify-center bg-up/10 text-up">
                    <ArrowUpRight size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-heading truncate">Buy {a.symbol}</div>
                    <div className="text-xs text-foreground/50">{formatDate(a.date)} · {a.quantity} shares</div>
                  </div>
                  <div className="text-sm font-semibold text-up">+₹{a.amount.toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usePortfolio } from "@/lib/usePortfolio";
import { useWatchlist } from "@/lib/useWatchlist";
import { getStock, getPortfolioHistory, PortfolioRange, RESEARCH_REPORTS } from "@/lib/mock-data";
import { useQuotes } from "@/lib/useQuotes";
import { useAllGeneratedReports } from "@/lib/useResearch";
import { withLiveQuote } from "@/lib/liveStock";
import { formatDate, formatINRCompact } from "@/lib/format";
import { Card, ChangeBadge, ChartMode, ChartModeToggle, LiveBadge, PriceAreaChart, RangeSelector, RatingPill } from "@/components/ui";
import PremiumGate from "@/components/PremiumGate";
import { Exchange, Stock } from "@/lib/types";
import { ArrowUpRight, Wallet, FileSearch } from "lucide-react";

const PORTFOLIO_RANGES: PortfolioRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

interface SymbolResult {
  symbol: string;
  name: string;
  exchange: Exchange;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<PortfolioRange>("1Y");
  const [chartMode, setChartMode] = useState<ChartMode>("price");
  const { positions, lots, ready: portfolioReady } = usePortfolio();
  const { symbols: watchlistSymbols, ready: watchlistReady } = useWatchlist();
  const { quotes, sources } = useQuotes(positions.map((p) => p.symbol));
  const generatedReports = useAllGeneratedReports();
  const [info, setInfo] = useState<Record<string, SymbolResult>>({});
  const fetchedInfoRef = useRef<Set<string>>(new Set());

  // Holdings in stocks beyond the small built-in mock set need their name/exchange
  // looked up from the live NSE/BSE instrument master (mirrors the portfolio page).
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

  const rows = positions
    .map((p) => {
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
      if (!baseStock) return null;
      const s = withLiveQuote(baseStock, quotes[p.symbol]);
      const priceKnown = s.price > 0;
      const invested = p.avgPrice * p.quantity;
      const value = (priceKnown ? s.price : p.avgPrice) * p.quantity;
      const dayChange = priceKnown ? (s.price - s.prevClose) * p.quantity : 0;
      return { p, s, invested, value, dayChange };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const totalDayChange = rows.reduce((sum, r) => sum + r.dayChange, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested ? (totalGain / totalInvested) * 100 : 0;
  const dayChangePct = totalValue - totalDayChange ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

  const wealthHistory = getPortfolioHistory(totalValue, range);

  // No real historical portfolio P/E data exists — approximate it the same
  // way wealthHistory itself is already a synthetic random walk, anchored to
  // today's value-weighted average P/E across holdings with a known P/E.
  const peRows = rows.filter((r) => r.s.peRatio != null);
  const peWeightTotal = peRows.reduce((sum, r) => sum + r.value, 0);
  const weightedPe =
    peWeightTotal > 0
      ? peRows.reduce((sum, r) => sum + (r.s.peRatio as number) * r.value, 0) / peWeightTotal
      : null;
  const peHistory = weightedPe != null ? getPortfolioHistory(weightedPe, range) : null;

  const generatedOrder = Object.keys(generatedReports);
  const recentResearch = Array.from(new Set([...RESEARCH_REPORTS.map((r) => r.symbol), ...generatedOrder]))
    .map((symbol) => ({
      symbol,
      report: RESEARCH_REPORTS.find((r) => r.symbol === symbol) ?? generatedReports[symbol],
      rank: generatedOrder.indexOf(symbol),
    }))
    .sort((a, b) => b.report.generatedOn.localeCompare(a.report.generatedOn) || b.rank - a.rank)
    .slice(0, 5);

  const recentActivity = [...lots]
    .sort((a, b) => b.buyDate.localeCompare(a.buyDate))
    .slice(0, 5)
    .map((l) => ({ id: l.id, symbol: l.symbol, date: l.buyDate, amount: l.avgPrice * l.quantity, quantity: l.quantity }));

  if (!portfolioReady || !watchlistReady) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-heading">Welcome back, {user?.name?.split(" ")[0] ?? "Investor"}</h2>
        <p className="text-sm text-foreground/60 mt-0.5">Here&apos;s how your portfolio is doing today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/portfolio" className="block">
          <Card className="h-full transition-colors hover:border-brand/40 hover:bg-background/40">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground/50 uppercase tracking-wide">
              <span className="flex items-center gap-2"><Wallet size={14} /> Portfolio value</span>
              {rows.length > 0 && (
                <LiveBadge source={rows.map((r) => sources[r.p.symbol]).find((s) => s && s !== "mock") ?? "mock"} />
              )}
            </div>
            <div className="text-2xl font-bold text-heading mt-2">{formatINRCompact(totalValue)}</div>
            <div className="mt-1"><ChangeBadge percent={dayChangePct} value={totalDayChange} /></div>
          </Card>
        </Link>
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
        <Card
          title="Your Wealth Today"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-2">
              <ChartModeToggle mode={chartMode} onChange={setChartMode} />
              <RangeSelector ranges={PORTFOLIO_RANGES} value={range} onChange={setRange} />
            </div>
          }
        >
          {chartMode === "pe" ? (
            peHistory ? (
              <>
                <div className="text-xl font-bold text-heading mb-2">{weightedPe!.toFixed(1)}x</div>
                <PriceAreaChart
                  data={peHistory.map((h) => ({ date: h.date, value: h.price }))}
                  valueLabel="P/E"
                  valueFormat={(v) => `${v.toFixed(1)}x`}
                />
              </>
            ) : (
              <p className="text-sm text-foreground/50 py-10 text-center">
                P/E unavailable — no holdings with a known P/E ratio.
              </p>
            )
          ) : (
            <>
              <div className="text-xl font-bold text-heading mb-2">{formatINRCompact(totalValue)}</div>
              <PriceAreaChart data={wealthHistory.map((h) => ({ date: h.date, value: h.price }))} />
            </>
          )}
        </Card>
        <PremiumGate feature="Research">
          <Card title="Run equity research" className="flex flex-col">
            <p className="text-sm text-foreground/60">
              Get an AI-generated equity research report — rating, target price, scenarios and risks — for any stock in seconds.
            </p>

            {recentResearch.length > 0 && (
              <div className="mt-3 flex-1 divide-y divide-line">
                {recentResearch.map(({ symbol, report }) => (
                  <Link
                    key={symbol}
                    href={`/dashboard/research/${symbol}`}
                    className="flex items-center justify-between py-2.5 hover:bg-background/60 rounded-lg px-2 -mx-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-heading">{symbol}</div>
                      <div className="text-xs text-foreground/50">{formatDate(report.generatedOn)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-heading">₹{report.targetPrice.toLocaleString("en-IN")}</span>
                      <RatingPill rating={report.rating} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/dashboard/research"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand/90 transition-colors"
            >
              <FileSearch size={16} />
              Go to Research
            </Link>
          </Card>
        </PremiumGate>
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
                .map(({ p, s, value }) => {
                  const pct = ((s.price - s.prevClose) / s.prevClose) * 100;
                  return (
                    <Link
                      key={p.symbol}
                      href={`/dashboard/stocks/${p.symbol}`}
                      className="flex items-center justify-between py-3 hover:bg-background/60 rounded-lg px-2 -mx-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-heading">{s.symbol}</div>
                        <div className="text-xs text-foreground/50">{p.quantity} shares</div>
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

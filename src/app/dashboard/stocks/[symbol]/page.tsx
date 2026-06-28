"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, FileSearch, LayoutDashboard, TrendingUp, Building2 } from "lucide-react";
import { getStock } from "@/lib/mock-data";
import { useWatchlist } from "@/lib/useWatchlist";
import { usePortfolio } from "@/lib/usePortfolio";
import { formatINR, formatINRCompact } from "@/lib/format";
import { derivePeHistory } from "@/lib/peHistory";
import { Card, ChangeBadge, ChartModeToggle, PriceAreaChart, RangeSelector, ChartMode } from "@/components/ui";
import {
  Exchange,
  FullQuote,
  CandlePoint,
  CompanyFundamentals,
} from "@/lib/types";

interface InstrumentInfo {
  symbol: string;
  name: string;
  exchange: Exchange;
}

type TrendRange = "1D" | "1W" | "1M" | "1Y" | "5Y";
const TREND_RANGES: TrendRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

type Tab = "overview" | "trends" | "fundamentals";
const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "trends", label: "Trends", icon: TrendingUp },
  { id: "fundamentals", label: "Fundamentals", icon: Building2 },
];

const QUOTE_REFRESH_MS = 60_000;

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol;
  const mockStock = getStock(symbol);

  const { symbols, toggle } = useWatchlist();
  const { positions } = usePortfolio();

  const [tab, setTab] = useState<Tab>("overview");
  const [trendRange, setTrendRange] = useState<TrendRange>("1Y");
  const [chartMode, setChartMode] = useState<ChartMode>("price");
  const [livePeHistory, setLivePeHistory] = useState<{ date: string; value: number }[] | null>(null);

  const [instrument, setInstrument] = useState<InstrumentInfo | null | undefined>(undefined);
  const [apiConnected, setApiConnected] = useState(true);
  const [quote, setQuote] = useState<FullQuote | null | undefined>(undefined);
  const [quoteStale, setQuoteStale] = useState<string | null>(null);
  const [yearCandles, setYearCandles] = useState<CandlePoint[]>([]);
  const [trendCandles, setTrendCandles] = useState<CandlePoint[] | undefined>(undefined);
  const [fundamentals, setFundamentals] = useState<CompanyFundamentals | null | undefined>(undefined);
  const [fundamentalsStale, setFundamentalsStale] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/symbols/lookup?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setInstrument(body.ok ? body.instrument : null);
      })
      .catch(() => {
        if (!cancelled) setInstrument(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/upstox/status")
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setApiConnected(Boolean(body.upstoxConnected));
      })
      .catch(() => {
        if (!cancelled) setApiConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuote() {
      try {
        const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/quote`);
        const body = await res.json();
        if (!cancelled) {
          setQuote(body.ok ? body.quote : null);
          setQuoteStale(body.ok && body.stale ? body.staleAt : null);
        }
      } catch {
        if (!cancelled) setQuote(null);
      }
    }
    fetchQuote();
    const interval = setInterval(fetchQuote, QUOTE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?range=1Y`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setYearCandles(body.ok ? body.candles : []);
      })
      .catch(() => {
        if (!cancelled) setYearCandles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show a loading state while the new range's candles load
    setTrendCandles(undefined);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?range=${trendRange}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setTrendCandles(body.ok ? body.candles : []);
      })
      .catch(() => {
        if (!cancelled) setTrendCandles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, trendRange]);

  useEffect(() => {
    if (mockStock) return;
    let cancelled = false;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/pe-history`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setLivePeHistory(body.ok ? body.peHistory : null);
      })
      .catch(() => {
        if (!cancelled) setLivePeHistory(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, mockStock]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/fundamentals`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) {
          setFundamentals(body.ok ? body.fundamentals : null);
          setFundamentalsStale(body.ok && body.stale ? body.staleAt : null);
        }
      })
      .catch(() => {
        if (!cancelled) setFundamentals(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (instrument === undefined) return null;
  if (instrument === null) return notFound();

  const inWatchlist = symbols.includes(instrument.symbol);
  const holding = positions.find((p) => p.symbol === instrument.symbol);
  const pct = quote && quote.prevClose ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : 0;
  const week52High = yearCandles.length ? Math.max(...yearCandles.map((c) => c.high)) : null;
  const week52Low = yearCandles.length ? Math.min(...yearCandles.map((c) => c.low)) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-heading">{instrument.symbol}</h2>
            <span className="text-xs font-semibold text-foreground/40 bg-background rounded px-1.5 py-0.5">
              {instrument.exchange}
            </span>
          </div>
          <p className="text-sm text-foreground/60">{instrument.name}</p>
          <div className="flex items-baseline gap-3 mt-3">
            {quote ? (
              <>
                <span className="text-3xl font-bold text-heading">₹{formatINR(quote.price)}</span>
                <ChangeBadge value={quote.netChange} percent={pct} />
                {quoteStale ? (
                  <span
                    className="text-[11px] font-semibold text-amber-500 flex items-center gap-1.5"
                    title={`Live token expired — showing the last price reported on ${new Date(quoteStale).toLocaleString("en-IN")}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Stale
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-up flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-up" /> Live
                  </span>
                )}
              </>
            ) : quote === undefined ? (
              <span className="text-sm text-foreground/50">Loading price…</span>
            ) : !apiConnected ? (
              <span className="text-sm text-foreground/50">
                API not connected.{" "}
                <Link href="/dashboard/settings" className="text-brand font-medium hover:underline">
                  Connect it in Settings
                </Link>{" "}
                to see live prices for this symbol.
              </span>
            ) : (
              <span className="text-sm text-foreground/50">No live quote available for this symbol.</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggle(instrument.symbol)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-background"
          >
            <Star size={15} className={inWatchlist ? "text-amber-400 fill-amber-400" : "text-foreground/40"} />
            {inWatchlist ? "In watchlist" : "Add to watchlist"}
          </button>
          {mockStock && (
            <Link
              href={`/dashboard/research/${instrument.symbol}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white px-3.5 py-2 text-sm font-semibold hover:bg-brand/90"
            >
              <FileSearch size={15} /> Research
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-surface border border-line p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-md transition-colors ${
              tab === id ? "bg-brand text-white" : "text-foreground/50 hover:text-foreground"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab quote={quote} week52High={week52High} week52Low={week52Low} holding={holding} price={quote?.price} />
      )}

      {tab === "trends" && (
        <TrendsTab
          symbol={instrument.symbol}
          range={trendRange}
          onRangeChange={setTrendRange}
          candles={trendCandles}
          up={pct >= 0}
          chartMode={chartMode}
          onChartModeChange={setChartMode}
          peData={mockStock ? derivePeHistory(mockStock) : livePeHistory}
        />
      )}

      {tab === "fundamentals" && <FundamentalsTab fundamentals={fundamentals} staleAt={fundamentalsStale} />}
    </div>
  );
}

function OverviewTab({
  quote,
  week52High,
  week52Low,
  holding,
  price,
}: {
  quote: FullQuote | null | undefined;
  week52High: number | null;
  week52Low: number | null;
  holding?: { quantity: number; avgPrice: number };
  price?: number;
}) {
  if (!quote) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-6 text-center">
          Live quote data isn&apos;t available right now.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Day range" value={`₹${formatINR(quote.low)} – ₹${formatINR(quote.high)}`} />
        <Stat
          label="52 week range"
          value={week52High && week52Low ? `₹${formatINR(week52Low)} – ₹${formatINR(week52High)}` : "—"}
        />
        <Stat label="Prev close" value={`₹${formatINR(quote.prevClose)}`} />
        <Stat label="Volume" value={`${(quote.volume / 1_00_000).toFixed(2)}L shares`} />
        <Stat label="Avg traded price" value={`₹${formatINR(quote.averagePrice)}`} />
        <Stat
          label="Circuit limits"
          value={`₹${formatINR(quote.lowerCircuitLimit)} – ₹${formatINR(quote.upperCircuitLimit)}`}
        />
      </div>

      {(quote.depth.buy.length > 0 || quote.depth.sell.length > 0) && (
        <Card title="Market depth">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between text-xs text-foreground/50 pb-1 border-b border-line">
                <span>Bid qty</span>
                <span>Price</span>
              </div>
              {quote.depth.buy.slice(0, 3).map((level, i) => (
                <div key={i} className="flex justify-between py-1.5 text-up">
                  <span>{level.quantity.toLocaleString("en-IN")}</span>
                  <span>{level.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-xs text-foreground/50 pb-1 border-b border-line">
                <span>Price</span>
                <span>Ask qty</span>
              </div>
              {quote.depth.sell.slice(0, 3).map((level, i) => (
                <div key={i} className="flex justify-between py-1.5 text-down">
                  <span>{level.price.toFixed(2)}</span>
                  <span>{level.quantity.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {holding && price !== undefined && (
        <Card title="Your position">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Row label="Quantity" value={String(holding.quantity)} />
            <Row label="Avg. cost" value={`₹${formatINR(holding.avgPrice)}`} />
            <Row label="Current value" value={formatINRCompact(price * holding.quantity)} />
            <Row
              label="P&L"
              value={`${price * holding.quantity - holding.avgPrice * holding.quantity >= 0 ? "+" : ""}${formatINRCompact(
                price * holding.quantity - holding.avgPrice * holding.quantity
              )}`}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function TrendsTab({
  symbol,
  range,
  onRangeChange,
  candles,
  up,
  chartMode,
  onChartModeChange,
  peData,
}: {
  symbol: string;
  range: TrendRange;
  onRangeChange: (r: TrendRange) => void;
  candles: CandlePoint[] | undefined;
  up: boolean;
  chartMode: ChartMode;
  onChartModeChange: (m: ChartMode) => void;
  peData: { date: string; value: number }[] | null;
}) {
  const maxVolume = candles && candles.length ? Math.max(...candles.map((c) => c.volume)) : 0;
  const priceData = candles?.map((c) => ({ date: c.date, value: c.close })) ?? [];
  const chartData = chartMode === "pe" ? peData ?? [] : priceData;

  return (
    <Card
      title={`${symbol} — Trend`}
      action={
        <div className="flex items-center gap-2">
          <ChartModeToggle mode={chartMode} onChange={onChartModeChange} />
          <RangeSelector ranges={TREND_RANGES} value={range} onChange={onRangeChange} />
        </div>
      }
    >
      {chartMode === "pe" && !peData ? (
        <p className="text-sm text-foreground/50 py-10 text-center">P/E history unavailable for this stock.</p>
      ) : !candles && chartMode === "price" ? (
        <p className="text-sm text-foreground/50 py-10 text-center">Loading chart…</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-foreground/50 py-10 text-center">No historical data available for this range.</p>
      ) : (
        <>
          <PriceAreaChart
            data={chartData}
            color={up ? "#15803d" : "#dc2626"}
            height={260}
            valueLabel={chartMode === "pe" ? "P/E" : "Price"}
            valueFormat={chartMode === "pe" ? (v) => `${v.toFixed(1)}x` : undefined}
          />
          {chartMode === "price" && candles && maxVolume > 0 && (
            <>
              <div className="flex items-end gap-0.5 h-9 mt-2">
                {candles.map((c, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-brand/20 rounded-sm"
                    style={{ height: `${Math.max(4, (c.volume / maxVolume) * 100)}%` }}
                  />
                ))}
              </div>
              <p className="text-xs text-foreground/40 mt-1">Volume · Live historical candle data</p>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function FundamentalsTab({
  fundamentals,
  staleAt,
}: {
  fundamentals: CompanyFundamentals | null | undefined;
  staleAt: string | null;
}) {
  if (fundamentals === undefined) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">Loading fundamentals…</p>
      </Card>
    );
  }

  if (!fundamentals) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">
          Fundamentals data isn&apos;t available for this symbol right now.
        </p>
      </Card>
    );
  }

  const { profile, keyRatios, shareholding, corporateActions, competitors } = fundamentals;
  const shareholdingColors = ["bg-brand", "bg-up", "bg-blue-500", "bg-amber-400", "bg-foreground/20"];

  return (
    <div className="space-y-4">
      {staleAt && (
        <p className="text-xs font-medium text-amber-500">
          Live token expired — showing fundamentals last fetched {new Date(staleAt).toLocaleString("en-IN")}.
        </p>
      )}
      {profile && (
        <Card title="Company profile">
          <p className="text-sm text-foreground/60 leading-relaxed mb-3">{profile.description}</p>
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-foreground/50">Sector</div>
              <div className="text-sm font-semibold text-heading">{profile.sector}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/50">Sector market cap</div>
              <div className="text-sm font-semibold text-heading">
                ₹{formatINR(profile.sectorMarketCapInrCr, 0)} cr
              </div>
            </div>
          </div>
        </Card>
      )}

      {keyRatios.length > 0 && (
        <Card title="Key ratios">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {keyRatios.map((r) => (
              <div key={r.name} className="bg-background rounded-lg px-3.5 py-2.5">
                <div className="text-xs text-foreground/50">{r.name}</div>
                <div className="text-base font-semibold text-heading">{r.companyValue}</div>
                <div className="text-xs text-foreground/40">sector {r.sectorValue}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {shareholding.length > 0 && (
        <Card title="Shareholding pattern">
          <div className="flex h-3.5 rounded-full overflow-hidden">
            {shareholding.map((s, i) => (
              <div
                key={s.category}
                className={shareholdingColors[i % shareholdingColors.length]}
                style={{ width: `${s.percent}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-foreground/50">
            {shareholding.map((s, i) => (
              <span key={s.category} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${shareholdingColors[i % shareholdingColors.length]}`} />
                {s.category} {s.percent.toFixed(1)}%
              </span>
            ))}
          </div>
        </Card>
      )}

      {corporateActions.length > 0 && (
        <Card title="Corporate actions">
          <div className="divide-y divide-line">
            {corporateActions.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{a.details}</span>
                {a.exDate && <span className="text-foreground/50 text-xs">Ex-date {a.exDate}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {competitors.length > 0 && (
        <Card title="Competitors">
          <div className="flex flex-wrap gap-2">
            {competitors.map((c, i) => {
              const content = (
                <span className="bg-background rounded-full px-3 py-1.5 text-sm font-medium text-heading">
                  {c.name}
                </span>
              );
              return c.symbol ? (
                <Link key={i} href={`/dashboard/stocks/${c.symbol}`}>
                  {content}
                </Link>
              ) : (
                <span key={i}>{content}</span>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line rounded-lg px-3.5 py-2.5">
      <div className="text-xs text-foreground/50 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-heading">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between sm:flex-col sm:items-start gap-0.5">
      <dt className="text-foreground/50 text-xs sm:text-sm">{label}</dt>
      <dd className="font-semibold text-heading">{value}</dd>
    </div>
  );
}

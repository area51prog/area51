"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, FileSearch } from "lucide-react";
import { getStock } from "@/lib/mock-data";
import { useWatchlist } from "@/lib/useWatchlist";
import { usePortfolio } from "@/lib/usePortfolio";
import { useQuotes } from "@/lib/useQuotes";
import { withLiveQuote } from "@/lib/liveStock";
import { formatINR, formatINRCompact } from "@/lib/format";
import { Card, ChangeBadge, LiveBadge, PriceAreaChart } from "@/components/ui";

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol;
  const baseStock = getStock(symbol);
  const { symbols, toggle } = useWatchlist();
  const { positions } = usePortfolio();
  const { quotes, sources, loading } = useQuotes(baseStock ? [baseStock.symbol] : []);

  if (!baseStock) return notFound();

  const quote = quotes[baseStock.symbol];
  const stock = withLiveQuote(baseStock, quote);

  const pct = ((stock.price - stock.prevClose) / stock.prevClose) * 100;
  const change = stock.price - stock.prevClose;
  const inWatchlist = symbols.includes(stock.symbol);
  const holding = positions.find((p) => p.symbol === stock.symbol);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-heading">{stock.symbol}</h2>
            <span className="text-xs font-semibold text-foreground/40 bg-background rounded px-1.5 py-0.5">
              {stock.exchange}
            </span>
          </div>
          <p className="text-sm text-foreground/60">{stock.name} · {stock.sector}</p>
          <div className="flex items-baseline gap-3 mt-3">
            <span className="text-3xl font-bold text-heading">₹{formatINR(stock.price)}</span>
            <ChangeBadge value={change} percent={pct} />
            {!loading && <LiveBadge source={sources[stock.symbol]} />}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggle(stock.symbol)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-background"
          >
            <Star size={15} className={inWatchlist ? "text-amber-400 fill-amber-400" : "text-foreground/40"} />
            {inWatchlist ? "In watchlist" : "Add to watchlist"}
          </button>
          <Link
            href={`/dashboard/research/${stock.symbol}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white px-3.5 py-2 text-sm font-semibold hover:bg-brand/90"
          >
            <FileSearch size={15} /> Research
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title={`${stock.symbol} — 12 month trend`} className="lg:col-span-2">
          <PriceAreaChart data={stock.history} color={pct >= 0 ? "#15803d" : "#dc2626"} height={280} />
        </Card>
        <Card title="Key stats">
          <dl className="space-y-3 text-sm">
            <Row label="Day range" value={`₹${formatINR(stock.dayLow)} – ₹${formatINR(stock.dayHigh)}`} />
            <Row label="52 week range" value={`₹${formatINR(stock.week52Low)} – ₹${formatINR(stock.week52High)}`} />
            <Row label="Market cap" value={`₹${formatINR(stock.marketCapCr, 0)} cr`} />
            <Row label="P/E ratio" value={stock.peRatio ? stock.peRatio.toFixed(1) + "x" : "—"} />
            <Row label="Prev close" value={`₹${formatINR(stock.prevClose)}`} />
          </dl>
        </Card>
      </div>

      {holding && (
        <Card title="Your position">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Row label="Quantity" value={String(holding.quantity)} />
            <Row label="Avg. cost" value={`₹${formatINR(holding.avgPrice)}`} />
            <Row label="Current value" value={formatINRCompact(stock.price * holding.quantity)} />
            <Row
              label="P&L"
              value={`${stock.price * holding.quantity - holding.avgPrice * holding.quantity >= 0 ? "+" : ""}${formatINRCompact(
                stock.price * holding.quantity - holding.avgPrice * holding.quantity
              )}`}
            />
          </div>
        </Card>
      )}
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

import { differenceInDays } from "date-fns";
import { Lot, Position } from "./usePortfolio";
import { Transaction } from "./useTransactions";
import { LiveQuote, Stock } from "./types";
import { getSector } from "./sectorMap";

export type HoldingTerm = "short" | "long";

export function classifyHoldingTerm(buyDate: string, asOfDate: Date = new Date()): HoldingTerm {
  return differenceInDays(asOfDate, new Date(buyDate)) >= 365 ? "long" : "short";
}

export interface ContributionRow {
  symbol: string;
  value: number;
  invested: number;
  gain: number;
  gainPct: number;
  contributionToTotalReturnPct: number;
}

export function computeContribution(
  positions: Position[],
  priceBySymbol: Record<string, number>
): ContributionRow[] {
  const rows = positions.map((p) => {
    const price = priceBySymbol[p.symbol] ?? p.avgPrice;
    const value = price * p.quantity;
    const invested = p.avgPrice * p.quantity;
    const gain = value - invested;
    return {
      symbol: p.symbol,
      value,
      invested,
      gain,
      gainPct: invested ? (gain / invested) * 100 : 0,
    };
  });
  const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
  return rows
    .map((r) => ({
      ...r,
      contributionToTotalReturnPct: totalInvested ? (r.gain / totalInvested) * 100 : 0,
    }))
    .sort((a, b) => b.contributionToTotalReturnPct - a.contributionToTotalReturnPct);
}

export interface SectorAllocationRow {
  sector: string;
  value: number;
  pct: number;
}

export function computeSectorAllocation(
  positions: Position[],
  priceBySymbol: Record<string, number>
): SectorAllocationRow[] {
  const bySector = new Map<string, number>();
  for (const p of positions) {
    const price = priceBySymbol[p.symbol] ?? p.avgPrice;
    const value = price * p.quantity;
    const sector = getSector(p.symbol);
    bySector.set(sector, (bySector.get(sector) ?? 0) + value);
  }
  const total = Array.from(bySector.values()).reduce((sum, v) => sum + v, 0);
  return Array.from(bySector.entries())
    .map(([sector, value]) => ({ sector, value, pct: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

export interface ConcentrationResult {
  hhi: number;
  topHoldingPct: number;
  top3Pct: number;
}

export function computeConcentration(
  positions: Position[],
  priceBySymbol: Record<string, number>
): ConcentrationResult {
  const values = positions
    .map((p) => (priceBySymbol[p.symbol] ?? p.avgPrice) * p.quantity)
    .sort((a, b) => b - a);
  const total = values.reduce((sum, v) => sum + v, 0);
  if (!total) return { hhi: 0, topHoldingPct: 0, top3Pct: 0 };
  const weights = values.map((v) => (v / total) * 100);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const topHoldingPct = weights[0] ?? 0;
  const top3Pct = weights.slice(0, 3).reduce((sum, w) => sum + w, 0);
  return { hhi, topHoldingPct, top3Pct };
}

export interface VolatilityRow {
  symbol: string;
  volatilityPct: number | null;
}

export function computeVolatilityPerHolding(symbol: string, history: Stock["history"] | undefined): VolatilityRow {
  if (!history || history.length < 3) return { symbol, volatilityPct: null };
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].price;
    if (prev) returns.push((history[i].price - prev) / prev);
  }
  if (returns.length === 0) return { symbol, volatilityPct: null };
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return { symbol, volatilityPct: Math.sqrt(variance) * 100 };
}

export interface TradeStats {
  totalTrades: number;
  winRate: number | null;
  avgGain: number;
  avgLoss: number;
  bestTrade: Transaction | null;
  worstTrade: Transaction | null;
}

export function computeTradeStats(transactions: Transaction[]): TradeStats {
  const sells = transactions.filter((t) => t.side === "sell" && t.realizedPnl !== null);
  if (sells.length === 0) {
    return { totalTrades: 0, winRate: null, avgGain: 0, avgLoss: 0, bestTrade: null, worstTrade: null };
  }
  const wins = sells.filter((t) => (t.realizedPnl ?? 0) > 0);
  const losses = sells.filter((t) => (t.realizedPnl ?? 0) <= 0);
  const avgGain = wins.length ? wins.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0) / losses.length : 0;
  const sorted = [...sells].sort((a, b) => (b.realizedPnl ?? 0) - (a.realizedPnl ?? 0));
  return {
    totalTrades: sells.length,
    winRate: (wins.length / sells.length) * 100,
    avgGain,
    avgLoss,
    bestTrade: sorted[0] ?? null,
    worstTrade: sorted[sorted.length - 1] ?? null,
  };
}

export type HoldingPeriodBucket = "<1mo" | "1-3mo" | "3-6mo" | "6-12mo" | ">1yr";

const BUCKET_ORDER: HoldingPeriodBucket[] = ["<1mo", "1-3mo", "3-6mo", "6-12mo", ">1yr"];

function bucketForDays(days: number): HoldingPeriodBucket {
  if (days < 30) return "<1mo";
  if (days < 90) return "1-3mo";
  if (days < 180) return "3-6mo";
  if (days < 365) return "6-12mo";
  return ">1yr";
}

export interface HoldingPeriodDistribution {
  bucket: HoldingPeriodBucket;
  count: number;
}

// Replays each symbol's buy/sell transactions in FIFO order (mirroring the
// FIFO consumption already done server-side in usePortfolio.sellHolding) to
// pair closed trades with a holding period, plus open lots measured to today.
export function computeHoldingPeriods(lots: Lot[], transactions: Transaction[]): HoldingPeriodDistribution[] {
  const counts = new Map<HoldingPeriodBucket, number>(BUCKET_ORDER.map((b) => [b, 0]));
  const today = new Date();

  for (const lot of lots) {
    const days = differenceInDays(today, new Date(lot.buyDate));
    const bucket = bucketForDays(days);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const bySymbol = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = bySymbol.get(t.symbol) ?? [];
    list.push(t);
    bySymbol.set(t.symbol, list);
  }

  for (const txns of bySymbol.values()) {
    const sorted = [...txns].sort((a, b) => a.txnDate.localeCompare(b.txnDate));
    const openBuys = sorted.filter((t) => t.side === "buy").map((t) => ({ date: t.txnDate, remaining: t.quantity }));
    for (const sell of sorted.filter((t) => t.side === "sell")) {
      let remaining = sell.quantity;
      for (const buy of openBuys) {
        if (remaining <= 0) break;
        if (buy.remaining <= 0) continue;
        const matched = Math.min(buy.remaining, remaining);
        buy.remaining -= matched;
        remaining -= matched;
        const days = differenceInDays(new Date(sell.txnDate), new Date(buy.date));
        const bucket = bucketForDays(Math.max(days, 0));
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
      }
    }
  }

  return BUCKET_ORDER.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }));
}

export interface RealizedVsUnrealized {
  realized: number;
  unrealized: number;
}

export function computeRealizedVsUnrealized(
  positions: Position[],
  transactions: Transaction[],
  priceBySymbol: Record<string, number>
): RealizedVsUnrealized {
  const realized = transactions.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
  const unrealized = positions.reduce((sum, p) => {
    const price = priceBySymbol[p.symbol] ?? p.avgPrice;
    return sum + (price - p.avgPrice) * p.quantity;
  }, 0);
  return { realized, unrealized };
}

export interface TaxLossCandidate {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedLoss: number;
  term: HoldingTerm;
  buyDate: string;
}

export function findTaxLossCandidates(
  lots: Lot[],
  priceBySymbol: Record<string, number>
): TaxLossCandidate[] {
  return lots
    .map((lot) => {
      const currentPrice = priceBySymbol[lot.symbol] ?? lot.avgPrice;
      const unrealizedLoss = (currentPrice - lot.avgPrice) * lot.quantity;
      return {
        symbol: lot.symbol,
        quantity: lot.quantity,
        avgPrice: lot.avgPrice,
        currentPrice,
        unrealizedLoss,
        term: classifyHoldingTerm(lot.buyDate),
        buyDate: lot.buyDate,
      };
    })
    .filter((c) => c.unrealizedLoss < 0)
    .sort((a, b) => a.unrealizedLoss - b.unrealizedLoss);
}

export function priceMapFromQuotes(
  positions: Position[],
  quotes: Record<string, LiveQuote | undefined>,
  fallbackPrice: (symbol: string) => number | null
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of positions) {
    const quotePrice = quotes[p.symbol]?.price;
    const fallback = fallbackPrice(p.symbol);
    map[p.symbol] = quotePrice ?? fallback ?? p.avgPrice;
  }
  return map;
}

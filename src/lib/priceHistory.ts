import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";
import { CandlePoint } from "@/lib/types";
import { getUpstoxHistoricalCandles } from "@/lib/providers/upstox";

type Client = SupabaseClient<Database>;

// Golden copy of daily OHLCV history, sourced from Upstox the first time a
// symbol is searched/resolved and reused after that. Daily bars only move
// once a day, so anything already covering up to yesterday is fresh enough.
const FRESHNESS_DAYS = 1;

function toTradeDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function rowsToCandles(rows: { trade_date: string; open: number; high: number; low: number; close: number; volume: number }[]): CandlePoint[] {
  return rows.map((r) => ({
    date: new Date(r.trade_date).toLocaleString("en-IN", { day: "2-digit", month: "short" }),
    timestamp: new Date(r.trade_date).toISOString(),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}

export async function getStoredHistory(supabase: Client, symbol: string, days = 365): Promise<CandlePoint[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { data } = await supabase
    .from("stock_price_history")
    .select("trade_date, open, high, low, close, volume")
    .eq("symbol", symbol)
    .gte("trade_date", cutoff.toISOString().slice(0, 10))
    .order("trade_date", { ascending: true });

  return rowsToCandles(data ?? []);
}

export async function upsertHistory(supabase: Client, symbol: string, candles: CandlePoint[]): Promise<void> {
  if (candles.length === 0) return;
  await supabase.from("stock_price_history").upsert(
    candles.map((c) => ({
      symbol,
      trade_date: toTradeDate(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      fetched_at: new Date().toISOString(),
    })),
    { onConflict: "symbol,trade_date" }
  );
}

// Lazily backfills the golden table the first time a symbol is searched, and
// refetches from Upstox only once the stored history goes stale (>1 day old).
export async function ensureGoldenHistory(supabase: Client, symbol: string): Promise<CandlePoint[]> {
  const { data: latest } = await supabase
    .from("stock_price_history")
    .select("trade_date")
    .eq("symbol", symbol)
    .order("trade_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isFresh =
    latest && Date.now() - new Date(latest.trade_date).getTime() < FRESHNESS_DAYS * 24 * 60 * 60 * 1000;

  if (isFresh) {
    return getStoredHistory(supabase, symbol);
  }

  const fresh = await getUpstoxHistoricalCandles(supabase, symbol, "1Y");
  if (fresh.length > 0) {
    await upsertHistory(supabase, symbol, fresh);
    return fresh;
  }

  // Upstox fetch failed (e.g. token expired) - fall back to whatever we already have.
  return getStoredHistory(supabase, symbol);
}

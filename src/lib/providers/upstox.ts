import { SupabaseClient } from "@supabase/supabase-js";
import { getValidUpstoxAccessToken } from "@/lib/upstoxToken";
import { getInstrumentKeys } from "@/lib/providers/instruments";
import { Database } from "@/lib/supabase/database.types";
import { LiveQuote } from "@/lib/types";

interface OhlcEntry {
  last_price: number;
  instrument_token: string;
  prev_ohlc: { open: number; high: number; low: number; close: number } | null;
  live_ohlc: { open: number; high: number; low: number; close: number };
}

export async function getUpstoxQuotes(
  supabase: SupabaseClient<Database>,
  symbols: string[]
): Promise<Record<string, LiveQuote>> {
  const accessToken = await getValidUpstoxAccessToken(supabase);
  if (!accessToken || symbols.length === 0) return {};

  let instrumentMap: Map<string, string>;
  try {
    instrumentMap = await getInstrumentKeys(symbols);
  } catch {
    return {};
  }

  const symbolByInstrumentKey = new Map<string, string>();
  for (const symbol of symbols) {
    const key = instrumentMap.get(symbol);
    if (key) symbolByInstrumentKey.set(key, symbol);
  }

  if (symbolByInstrumentKey.size === 0) return {};

  const instrumentKeys = [...symbolByInstrumentKey.keys()].join(",");

  try {
    const res = await fetch(
      `https://api.upstox.com/v3/market-quote/ohlc?instrument_key=${encodeURIComponent(instrumentKeys)}&interval=1d`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return {};

    const body: { status: string; data?: Record<string, OhlcEntry> } = await res.json();
    if (body.status !== "success" || !body.data) return {};

    const result: Record<string, LiveQuote> = {};
    for (const entry of Object.values(body.data)) {
      const symbol = symbolByInstrumentKey.get(entry.instrument_token);
      if (!symbol) continue;
      const prevClose = entry.prev_ohlc?.close ?? entry.live_ohlc.close;
      const price = entry.last_price;
      result[symbol] = {
        price,
        change: price - prevClose,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
        high: entry.live_ohlc.high,
        low: entry.live_ohlc.low,
        prevClose,
      };
    }
    return result;
  } catch {
    return {};
  }
}

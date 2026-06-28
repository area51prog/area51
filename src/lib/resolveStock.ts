import { SupabaseClient } from "@supabase/supabase-js";
import { getStock } from "@/lib/mock-data";
import { lookupInstrument } from "@/lib/providers/instruments";
import { getUpstoxFullQuote, getUpstoxFundamentals } from "@/lib/providers/upstox";
import { ensureGoldenHistory } from "@/lib/priceHistory";
import { Database } from "@/lib/supabase/database.types";
import { Stock } from "@/lib/types";

export interface ResolvedStock {
  stock: Stock;
  extraContext: string | null;
}

export async function resolveStock(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<ResolvedStock | null> {
  const mock = getStock(symbol);
  if (mock) return { stock: mock, extraContext: null };

  const instrument = await lookupInstrument(symbol).catch(() => null);
  if (!instrument) return null;

  const quote = await getUpstoxFullQuote(supabase, symbol);
  if (!quote) return null;

  const [candles, fundamentals] = await Promise.all([
    ensureGoldenHistory(supabase, symbol),
    getUpstoxFundamentals(supabase, symbol),
  ]);

  const week52High = candles.length ? Math.max(...candles.map((c) => c.high)) : quote.high;
  const week52Low = candles.length ? Math.min(...candles.map((c) => c.low)) : quote.low;

  const stock: Stock = {
    symbol: instrument.symbol,
    name: instrument.name,
    exchange: instrument.exchange,
    sector: fundamentals?.profile?.sector || "Unknown",
    price: quote.price,
    prevClose: quote.prevClose,
    dayHigh: quote.high,
    dayLow: quote.low,
    week52High,
    week52Low,
    marketCapCr: 0,
    peRatio: null,
    history: candles.map((c) => ({ date: c.date, price: c.close })),
  };

  const extraContext = fundamentals?.keyRatios.length
    ? `Additional reported ratios: ${fundamentals.keyRatios
        .slice(0, 8)
        .map((r) => `${r.name}: ${r.companyValue}`)
        .join(", ")}`
    : null;

  return { stock, extraContext };
}

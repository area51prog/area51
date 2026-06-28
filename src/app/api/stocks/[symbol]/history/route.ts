import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxHistoricalCandles, TrendRange } from "@/lib/providers/upstox";
import { ensureGoldenHistory } from "@/lib/priceHistory";

const VALID_RANGES: TrendRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

// 1W/1M/1Y are all daily bars, so they're served from the golden copy
// (backfilling it on first request). 1D (intraday) and 5Y (weekly) aren't
// stored there and still go straight to Upstox.
const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "1Y": 365 };

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = VALID_RANGES.includes(rangeParam as TrendRange) ? (rangeParam as TrendRange) : "1Y";

  const supabase = await createClient();

  if (range in RANGE_DAYS) {
    const history = await ensureGoldenHistory(supabase, symbol);
    const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
    const candles = history.filter((c) => new Date(c.timestamp).getTime() >= cutoff);
    return Response.json({ ok: true, candles });
  }

  const candles = await getUpstoxHistoricalCandles(supabase, symbol, range);
  return Response.json({ ok: true, candles });
}

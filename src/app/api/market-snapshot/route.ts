import { createClient } from "@/lib/supabase/server";
import { getUpstoxHistoricalCandles, TrendRange } from "@/lib/providers/upstox";

const NIFTY_50_SYMBOL = "NSE_INDEX|Nifty 50";

const MOCK_CANDLES: Record<TrendRange, { date: string; value: number }[]> = {
  "1D": [
    { date: "9:15", value: 24470 },
    { date: "11:15", value: 24495 },
    { date: "1:15", value: 24480 },
    { date: "3:30", value: 24510 },
  ],
  "1W": [
    { date: "Mon", value: 24180 },
    { date: "Tue", value: 24310 },
    { date: "Wed", value: 24255 },
    { date: "Thu", value: 24420 },
    { date: "Fri", value: 24510 },
  ],
  "1M": [
    { date: "Wk 1", value: 23980 },
    { date: "Wk 2", value: 24210 },
    { date: "Wk 3", value: 24340 },
    { date: "Wk 4", value: 24510 },
  ],
  "1Y": [
    { date: "Jul", value: 21500 },
    { date: "Oct", value: 22300 },
    { date: "Jan", value: 23100 },
    { date: "Apr", value: 23800 },
    { date: "Jun", value: 24510 },
  ],
  "5Y": [
    { date: "2022", value: 16500 },
    { date: "2023", value: 19800 },
    { date: "2024", value: 21700 },
    { date: "2025", value: 23400 },
    { date: "2026", value: 24510 },
  ],
};

function isTrendRange(value: string | null): value is TrendRange {
  return value === "1D" || value === "1W" || value === "1M" || value === "1Y" || value === "5Y";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const range: TrendRange = isTrendRange(rangeParam) ? rangeParam : "1M";

  try {
    const supabase = await createClient();
    const candles = await getUpstoxHistoricalCandles(supabase, NIFTY_50_SYMBOL, range);
    if (candles.length === 0) {
      return Response.json({ ok: true, mock: true, points: MOCK_CANDLES[range] });
    }
    const points = candles.map((c) => ({ date: c.date, value: c.close }));
    return Response.json({ ok: true, mock: false, points });
  } catch {
    return Response.json({ ok: true, mock: true, points: MOCK_CANDLES[range] });
  }
}

import { createClient } from "@/lib/supabase/server";
import { getUpstoxHistoricalCandles } from "@/lib/providers/upstox";

const NIFTY_50_SYMBOL = "NSE_INDEX|Nifty 50";

const MOCK_CANDLES = [
  { date: "Mon", value: 24180 },
  { date: "Tue", value: 24310 },
  { date: "Wed", value: 24255 },
  { date: "Thu", value: 24420 },
  { date: "Fri", value: 24510 },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const candles = await getUpstoxHistoricalCandles(supabase, NIFTY_50_SYMBOL, "1M");
    if (candles.length === 0) {
      return Response.json({ ok: true, mock: true, points: MOCK_CANDLES });
    }
    const points = candles.map((c) => ({ date: c.date, value: c.close }));
    return Response.json({ ok: true, mock: false, points });
  } catch {
    return Response.json({ ok: true, mock: true, points: MOCK_CANDLES });
  }
}

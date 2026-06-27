import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxHistoricalCandles, TrendRange } from "@/lib/providers/upstox";

const VALID_RANGES: TrendRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = VALID_RANGES.includes(rangeParam as TrendRange) ? (rangeParam as TrendRange) : "1Y";

  const supabase = await createClient();
  const candles = await getUpstoxHistoricalCandles(supabase, symbol, range);
  return Response.json({ ok: true, candles });
}

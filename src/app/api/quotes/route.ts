import { NextRequest } from "next/server";
import { getUpstoxQuotes } from "@/lib/providers/upstox";
import { getFinnhubQuotes } from "@/lib/providers/finnhub";
import { createClient } from "@/lib/supabase/server";
import { LiveQuote, QuoteSource } from "@/lib/types";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const symbols = symbolsParam
    ? [...new Set(symbolsParam.split(",").map((s) => s.trim()).filter(Boolean))]
    : [];

  if (symbols.length === 0) {
    return Response.json({ ok: true, quotes: {}, sources: {} });
  }

  const sources: Record<string, QuoteSource> = {};
  const quotes: Record<string, LiveQuote> = {};

  // Provider order: Upstox (NSE-native) first, then Finnhub for anything Upstox
  // didn't cover. Symbols neither provider has data for stay unset — the
  // client falls back to mock data for those.
  const supabase = await createClient();
  const upstoxQuotes = await getUpstoxQuotes(supabase, symbols);
  for (const symbol of Object.keys(upstoxQuotes)) {
    quotes[symbol] = upstoxQuotes[symbol];
    sources[symbol] = "upstox";
  }

  const remaining = symbols.filter((s) => !quotes[s]);
  if (remaining.length > 0) {
    const finnhubQuotes = await getFinnhubQuotes(remaining);
    for (const symbol of Object.keys(finnhubQuotes)) {
      quotes[symbol] = finnhubQuotes[symbol];
      sources[symbol] = "finnhub";
    }
  }

  for (const symbol of symbols) {
    if (!sources[symbol]) sources[symbol] = "mock";
  }

  return Response.json({ ok: true, quotes, sources });
}

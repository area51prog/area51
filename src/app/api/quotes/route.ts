import { NextRequest } from "next/server";
import { getUpstoxQuotes, getStaleUpstoxQuotes } from "@/lib/providers/upstox";
import { getFinnhubQuotes } from "@/lib/providers/finnhub";
import { createClient } from "@/lib/supabase/server";
import { LiveQuote, QuoteSource } from "@/lib/types";
import { logApiUsage } from "@/lib/adminLog";

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
  const upstoxStart = Date.now();
  const upstoxQuotes = await getUpstoxQuotes(supabase, symbols);
  for (const symbol of Object.keys(upstoxQuotes)) {
    quotes[symbol] = upstoxQuotes[symbol];
    sources[symbol] = "upstox";
  }
  void logApiUsage({
    provider: "upstox",
    endpoint: "quotes",
    status: Object.keys(upstoxQuotes).length > 0 ? "ok" : "error",
    latencyMs: Date.now() - upstoxStart,
  });

  const remaining = symbols.filter((s) => !quotes[s]);
  if (remaining.length > 0) {
    const finnhubStart = Date.now();
    const finnhubQuotes = await getFinnhubQuotes(remaining);
    for (const symbol of Object.keys(finnhubQuotes)) {
      quotes[symbol] = finnhubQuotes[symbol];
      sources[symbol] = "finnhub";
    }
    void logApiUsage({
      provider: "finnhub",
      endpoint: "quotes",
      status: Object.keys(finnhubQuotes).length > 0 ? "ok" : "error",
      latencyMs: Date.now() - finnhubStart,
    });
  }

  // Neither Upstox nor Finnhub had data — most likely an expired Upstox
  // token. Fall back to the last quote Upstox successfully reported rather
  // than jumping straight to mock numbers.
  const stillMissing = symbols.filter((s) => !quotes[s]);
  const staleAt: Record<string, string> = {};
  if (stillMissing.length > 0) {
    const staleQuotes = await getStaleUpstoxQuotes(supabase, stillMissing);
    for (const symbol of Object.keys(staleQuotes)) {
      quotes[symbol] = staleQuotes[symbol].payload;
      sources[symbol] = "upstox-stale";
      staleAt[symbol] = staleQuotes[symbol].fetchedAt;
    }
  }

  for (const symbol of symbols) {
    if (!sources[symbol]) sources[symbol] = "mock";
  }

  return Response.json({ ok: true, quotes, sources, staleAt });
}

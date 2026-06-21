import { toFinnhubSymbol } from "@/lib/mock-data";
import { LiveQuote } from "@/lib/types";

interface FinnhubQuoteResponse {
  c: number;
  d: number | null;
  dp: number | null;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export interface ProviderResult {
  symbol: string;
  quote?: LiveQuote;
  error?: string;
  source: "finnhub";
}

export async function getFinnhubQuote(symbol: string): Promise<ProviderResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { symbol, error: "FINNHUB_API_KEY not configured", source: "finnhub" };
  }

  const finnhubSymbol = toFinnhubSymbol(symbol);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return { symbol, error: `Finnhub responded ${res.status}`, source: "finnhub" };
    }

    const data: FinnhubQuoteResponse = await res.json();

    // Finnhub returns an all-zero object (no error) when it has no data for a
    // symbol — common for NSE tickers on the free tier.
    if (!data || (data.c === 0 && data.pc === 0)) {
      return { symbol, error: "No data for symbol", source: "finnhub" };
    }

    return {
      symbol,
      source: "finnhub",
      quote: {
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        prevClose: data.pc,
      },
    };
  } catch {
    return { symbol, error: "Request to Finnhub failed", source: "finnhub" };
  }
}

export async function getFinnhubQuotes(symbols: string[]): Promise<Record<string, LiveQuote>> {
  const results = await Promise.all(symbols.map(getFinnhubQuote));
  const map: Record<string, LiveQuote> = {};
  for (const r of results) {
    if (r.quote) map[r.symbol] = r.quote;
  }
  return map;
}

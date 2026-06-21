import zlib from "zlib";
import { getValidUpstoxAccessToken } from "@/lib/upstoxToken";
import { LiveQuote } from "@/lib/types";

const INSTRUMENTS_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface UpstoxInstrument {
  instrument_key: string;
  trading_symbol: string;
  segment: string;
  instrument_type: string;
}

interface OhlcEntry {
  last_price: number;
  instrument_token: string;
  prev_ohlc: { open: number; high: number; low: number; close: number };
  live_ohlc: { open: number; high: number; low: number; close: number };
}

let instrumentCache: { map: Map<string, string>; fetchedAt: number } | null = null;

async function loadInstrumentMap(): Promise<Map<string, string>> {
  if (instrumentCache && Date.now() - instrumentCache.fetchedAt < CACHE_TTL_MS) {
    return instrumentCache.map;
  }

  const res = await fetch(INSTRUMENTS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch Upstox instrument master: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const json = zlib.gunzipSync(buf).toString("utf-8");
  const instruments: UpstoxInstrument[] = JSON.parse(json);

  const map = new Map<string, string>();
  for (const inst of instruments) {
    if (inst.segment === "NSE_EQ" && inst.instrument_type === "EQ") {
      map.set(inst.trading_symbol, inst.instrument_key);
    }
  }

  instrumentCache = { map, fetchedAt: Date.now() };
  return map;
}

export async function getUpstoxQuotes(symbols: string[]): Promise<Record<string, LiveQuote>> {
  const accessToken = getValidUpstoxAccessToken();
  if (!accessToken || symbols.length === 0) return {};

  let instrumentMap: Map<string, string>;
  try {
    instrumentMap = await loadInstrumentMap();
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
      const prevClose = entry.prev_ohlc.close;
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

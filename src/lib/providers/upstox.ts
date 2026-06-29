import { SupabaseClient } from "@supabase/supabase-js";
import { getValidUpstoxAccessToken } from "@/lib/upstoxToken";
import { getInstrumentKeys, getInstrumentKey, getIsin, lookupByInstrumentKey } from "@/lib/providers/instruments";
import { readStaleCache, readStaleCacheMany, writeStaleCache, writeStaleCacheMany, StaleEntry } from "@/lib/staleCache";
import { Database } from "@/lib/supabase/database.types";
import {
  LiveQuote,
  FullQuote,
  DepthLevel,
  CandlePoint,
  CompanyFundamentals,
  CompanyProfile,
  KeyRatio,
  ShareholdingSlice,
  CorporateAction,
  Competitor,
} from "@/lib/types";

interface OhlcEntry {
  last_price: number;
  instrument_token: string;
  prev_ohlc: { open: number; high: number; low: number; close: number } | null;
  live_ohlc: { open: number; high: number; low: number; close: number };
}

export type TrendRange = "1D" | "1W" | "1M" | "1Y" | "5Y";

// Quotes move every few seconds during market hours, but a short shared
// cache means concurrent users/tabs watching the same symbol within the
// window get served from memory instead of each triggering their own
// Upstox call (the 60s frontend poll otherwise multiplies per viewer).
const QUOTE_CACHE_TTL_MS = 20 * 1000;
const quoteCache = new Map<string, { quote: LiveQuote; fetchedAt: number }>();

export async function getUpstoxQuotes(
  supabase: SupabaseClient<Database>,
  symbols: string[]
): Promise<Record<string, LiveQuote>> {
  const result: Record<string, LiveQuote> = {};
  const now = Date.now();

  const toFetch: string[] = [];
  for (const symbol of symbols) {
    const cached = quoteCache.get(symbol);
    if (cached && now - cached.fetchedAt < QUOTE_CACHE_TTL_MS) {
      result[symbol] = cached.quote;
    } else {
      toFetch.push(symbol);
    }
  }

  if (toFetch.length === 0) return result;

  const accessToken = await getValidUpstoxAccessToken(supabase);
  if (!accessToken) return result;

  let instrumentMap: Map<string, string>;
  try {
    instrumentMap = await getInstrumentKeys(toFetch);
  } catch {
    return result;
  }

  const symbolByInstrumentKey = new Map<string, string>();
  for (const symbol of toFetch) {
    const key = instrumentMap.get(symbol);
    if (key) symbolByInstrumentKey.set(key, symbol);
  }

  if (symbolByInstrumentKey.size === 0) return result;

  const instrumentKeys = [...symbolByInstrumentKey.keys()].join(",");

  try {
    const res = await fetch(
      `https://api.upstox.com/v3/market-quote/ohlc?instrument_key=${encodeURIComponent(instrumentKeys)}&interval=1d`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return result;

    const body: { status: string; data?: Record<string, OhlcEntry> } = await res.json();
    if (body.status !== "success" || !body.data) return result;

    const fresh: Record<string, LiveQuote> = {};
    for (const entry of Object.values(body.data)) {
      const symbol = symbolByInstrumentKey.get(entry.instrument_token);
      if (!symbol) continue;
      const prevClose = entry.prev_ohlc?.close ?? entry.live_ohlc.close;
      const price = entry.last_price;
      fresh[symbol] = {
        price,
        change: price - prevClose,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
        high: entry.live_ohlc.high,
        low: entry.live_ohlc.low,
        prevClose,
      };
    }

    for (const [symbol, quote] of Object.entries(fresh)) {
      quoteCache.set(symbol, { quote, fetchedAt: now });
      result[symbol] = quote;
    }

    await writeStaleCacheMany(
      supabase,
      Object.entries(fresh).map(([symbol, quote]) => ({ cacheKey: `quote:${symbol}`, payload: quote }))
    );

    return result;
  } catch {
    return result;
  }
}

// Last-known-good Upstox quotes, served when the token has expired or Upstox
// (and Finnhub) had nothing — keeps the dashboard showing real numbers
// instead of jumping straight to mock data.
export async function getStaleUpstoxQuotes(
  supabase: SupabaseClient<Database>,
  symbols: string[]
): Promise<Record<string, StaleEntry<LiveQuote>>> {
  const cached = await readStaleCacheMany<LiveQuote>(supabase, symbols.map((s) => `quote:${s}`));
  const result: Record<string, StaleEntry<LiveQuote>> = {};
  for (const symbol of symbols) {
    const entry = cached.get(`quote:${symbol}`);
    if (entry) result[symbol] = entry;
  }
  return result;
}

interface FullQuoteEntry {
  ohlc: { open: number; high: number; low: number; close: number };
  last_price: number;
  volume: number;
  average_price: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  upper_circuit_limit: number;
  lower_circuit_limit: number;
  depth: { buy: { price: number; quantity: number }[]; sell: { price: number; quantity: number }[] };
  timestamp: string;
}

function toDepthLevels(levels: { price: number; quantity: number }[]): DepthLevel[] {
  return levels
    .filter((l) => l.quantity > 0)
    .slice(0, 5)
    .map((l) => ({ price: l.price, quantity: l.quantity }));
}

const fullQuoteCache = new Map<string, { quote: FullQuote; fetchedAt: number }>();

export async function getUpstoxFullQuote(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<FullQuote | null> {
  const cached = fullQuoteCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < QUOTE_CACHE_TTL_MS) return cached.quote;

  const accessToken = await getValidUpstoxAccessToken(supabase);
  if (!accessToken) return null;

  const instrumentKey = await getInstrumentKey(symbol).catch(() => null);
  if (!instrumentKey) return null;

  try {
    const res = await fetch(
      `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return null;

    const body: { status: string; data?: Record<string, FullQuoteEntry> } = await res.json();
    if (body.status !== "success" || !body.data) return null;

    const entry = Object.values(body.data)[0];
    if (!entry) return null;

    const quote: FullQuote = {
      price: entry.last_price,
      prevClose: entry.ohlc.close,
      high: entry.ohlc.high,
      low: entry.ohlc.low,
      open: entry.ohlc.open,
      volume: entry.volume,
      averagePrice: entry.average_price,
      netChange: entry.net_change,
      totalBuyQuantity: entry.total_buy_quantity,
      totalSellQuantity: entry.total_sell_quantity,
      upperCircuitLimit: entry.upper_circuit_limit,
      lowerCircuitLimit: entry.lower_circuit_limit,
      depth: {
        buy: toDepthLevels(entry.depth?.buy ?? []),
        sell: toDepthLevels(entry.depth?.sell ?? []),
      },
      timestamp: entry.timestamp,
    };

    fullQuoteCache.set(symbol, { quote, fetchedAt: Date.now() });
    await writeStaleCache(supabase, `full_quote:${symbol}`, quote);
    return quote;
  } catch {
    return null;
  }
}

export async function getStaleUpstoxFullQuote(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<StaleEntry<FullQuote> | null> {
  return readStaleCache<FullQuote>(supabase, `full_quote:${symbol}`);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const RANGE_CANDLE_CONFIG: Record<
  TrendRange,
  { unit: "minutes" | "days" | "weeks"; interval: number; daysBack: number }
> = {
  "1D": { unit: "minutes", interval: 30, daysBack: 1 },
  "1W": { unit: "days", interval: 1, daysBack: 7 },
  "1M": { unit: "days", interval: 1, daysBack: 30 },
  "1Y": { unit: "days", interval: 1, daysBack: 365 },
  "5Y": { unit: "weeks", interval: 1, daysBack: 5 * 365 },
};

type RawCandle = [string, number, number, number, number, number, number];

// 1Y/5Y candles are daily/weekly and only ever gain a new bar once a day at
// most — caching them for an hour avoids re-fetching the same multi-year
// history on every tab switch. 1D/1W/1M are still moving during market
// hours, so they get a much shorter TTL that just dedupes rapid range
// switches/re-renders instead of going fully live on every request.
const CANDLE_CACHE_TTL_MS: Record<TrendRange, number> = {
  "1D": 60 * 1000,
  "1W": 60 * 1000,
  "1M": 60 * 1000,
  "1Y": 60 * 60 * 1000,
  "5Y": 60 * 60 * 1000,
};
const candleCache = new Map<string, { candles: CandlePoint[]; fetchedAt: number }>();

export async function getUpstoxHistoricalCandles(
  supabase: SupabaseClient<Database>,
  symbol: string,
  range: TrendRange
): Promise<CandlePoint[]> {
  const cacheKey = `${symbol}:${range}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CANDLE_CACHE_TTL_MS[range]) return cached.candles;

  const accessToken = await getValidUpstoxAccessToken(supabase);
  if (!accessToken) return [];

  const instrumentKey = await getInstrumentKey(symbol).catch(() => null);
  if (!instrumentKey) return [];

  const { unit, interval, daysBack } = RANGE_CANDLE_CONFIG[range];
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

  try {
    const res = await fetch(
      `https://api.upstox.com/v3/historical-candle/${encodeURIComponent(instrumentKey)}/${unit}/${interval}/${isoDate(
        toDate
      )}/${isoDate(fromDate)}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return [];

    const body: { status: string; data?: { candles: RawCandle[] } } = await res.json();
    if (body.status !== "success" || !body.data) return [];

    const labelFormat: Intl.DateTimeFormatOptions =
      range === "1D"
        ? { hour: "2-digit", minute: "2-digit" }
        : range === "5Y"
          ? { month: "short", year: "2-digit" }
          : { day: "2-digit", month: "short" };

    const candles = body.data.candles
      .map(([ts, open, high, low, close, volume]) => ({
        timestamp: ts,
        date: new Date(ts).toLocaleString("en-IN", labelFormat),
        open,
        high,
        low,
        close,
        volume,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (candles.length > 0) {
      candleCache.set(cacheKey, { candles, fetchedAt: Date.now() });
    }

    if (candles.length > 0) {
      await writeStaleCache(supabase, `candles:${symbol}:${range}`, candles);
    }

    return candles;
  } catch {
    return [];
  }
}

export async function getStaleUpstoxCandles(
  supabase: SupabaseClient<Database>,
  symbol: string,
  range: TrendRange
): Promise<StaleEntry<CandlePoint[]> | null> {
  return readStaleCache<CandlePoint[]>(supabase, `candles:${symbol}:${range}`);
}

interface FundamentalsApiEntry {
  name?: string;
  company_value?: string;
  sector_value?: string;
  category?: string;
  history?: { period: string; value: number }[];
  expiry_date?: string;
  amount?: number | null;
  event_details?: { name: string; value: string }[];
  instrument_key?: string;
  company_profile?: string;
  sector?: string;
  sector_market_cap_inr?: { value: number };
}

const SHAREHOLDING_LABELS: Record<string, string> = {
  promoters: "Promoter",
  fii: "FII",
  dii: "DII",
  other_dii: "Other DII",
  mutual_funds: "Mutual funds",
  retail_and_other: "Retail & other",
};

function humanizeShareholdingCategory(category: string): string {
  return (
    SHAREHOLDING_LABELS[category] ??
    category.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

async function fetchFundamentalsEndpoint<T>(
  accessToken: string,
  pathKey: string,
  path: string
): Promise<T | null> {
  try {
    const res = await fetch(`https://api.upstox.com/v2/fundamentals/${encodeURIComponent(pathKey)}/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body: { status: string; data?: T } = await res.json();
    if (body.status !== "success" || body.data === undefined) return null;
    return body.data;
  } catch {
    return null;
  }
}

// Fundamentals (profile, ratios, shareholding, corporate actions,
// competitors) barely move intraday — a day-long cache avoids re-running 5
// Upstox endpoints every 60s alongside the quote poll.
const FUNDAMENTALS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const fundamentalsCache = new Map<string, { fundamentals: CompanyFundamentals; fetchedAt: number }>();

// `fundamentals` and `pe-history` both call this for the same symbol in
// parallel on page load — without coalescing, a cold cache means both race
// past the cache check and each fire the full 5-endpoint Upstox fetch.
// Tracking in-flight requests lets the second caller await the first's
// result instead of duplicating it.
const fundamentalsInFlight = new Map<string, Promise<CompanyFundamentals | null>>();

export async function getUpstoxFundamentals(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<CompanyFundamentals | null> {
  const cached = fundamentalsCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < FUNDAMENTALS_CACHE_TTL_MS) return cached.fundamentals;

  const inFlight = fundamentalsInFlight.get(symbol);
  if (inFlight) return inFlight;

  const promise = fetchUpstoxFundamentals(supabase, symbol).finally(() => {
    fundamentalsInFlight.delete(symbol);
  });
  fundamentalsInFlight.set(symbol, promise);
  return promise;
}

async function fetchUpstoxFundamentals(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<CompanyFundamentals | null> {
  const accessToken = await getValidUpstoxAccessToken(supabase);
  if (!accessToken) return null;

  const isin = await getIsin(symbol).catch(() => null);
  if (!isin) return null;

  // Every fundamentals endpoint is ISIN-keyed except `competitors`, which
  // (unlike its siblings) requires the full "<EXCHANGE>_EQ|<ISIN>" instrument key.
  const instrumentKey = await getInstrumentKey(symbol).catch(() => null);

  const [profileData, keyRatiosData, shareholdingData, corporateActionsData, competitorsData] = await Promise.all([
    fetchFundamentalsEndpoint<FundamentalsApiEntry>(accessToken, isin, "profile"),
    fetchFundamentalsEndpoint<FundamentalsApiEntry[]>(accessToken, isin, "key-ratios"),
    fetchFundamentalsEndpoint<FundamentalsApiEntry[]>(accessToken, isin, "share-holdings"),
    fetchFundamentalsEndpoint<FundamentalsApiEntry[]>(accessToken, isin, "corporate-actions"),
    instrumentKey
      ? fetchFundamentalsEndpoint<FundamentalsApiEntry[]>(accessToken, instrumentKey, "competitors")
      : Promise.resolve(null),
  ]);

  const profile: CompanyProfile | null = profileData
    ? {
        description: profileData.company_profile ?? "",
        sector: profileData.sector ?? "",
        sectorMarketCapInrCr: profileData.sector_market_cap_inr?.value ?? 0,
      }
    : null;

  const keyRatios: KeyRatio[] = (keyRatiosData ?? []).map((r) => ({
    name: r.name ?? "",
    companyValue: r.company_value ?? "—",
    sectorValue: r.sector_value ?? "—",
    history: r.history,
  }));

  const shareholding: ShareholdingSlice[] = (shareholdingData ?? [])
    .map((s) => {
      const latest = s.history?.[0];
      return latest
        ? { category: humanizeShareholdingCategory(s.category ?? ""), percent: latest.value, period: latest.period }
        : null;
    })
    .filter((s): s is ShareholdingSlice => s !== null);

  const corporateActions: CorporateAction[] = (corporateActionsData ?? []).map((a) => ({
    name: a.name ?? "",
    exDate: a.expiry_date ?? null,
    amount: a.amount ?? null,
    details: a.event_details?.find((d) => d.name === "Details")?.value ?? a.name ?? "",
  }));

  const competitors: Competitor[] = await Promise.all(
    (competitorsData ?? []).slice(0, 6).map(async (c) => {
      const instrument = c.instrument_key ? await lookupByInstrumentKey(c.instrument_key).catch(() => null) : null;
      return {
        symbol: instrument?.symbol ?? null,
        name: instrument?.name ?? c.sector ?? "Competitor",
        sector: c.sector ?? "",
        marketCapInrCr: c.sector_market_cap_inr?.value ?? 0,
      };
    })
  );

  if (!profile && keyRatios.length === 0 && shareholding.length === 0) return null;

  const fundamentals: CompanyFundamentals = { profile, keyRatios, shareholding, corporateActions, competitors };
  fundamentalsCache.set(symbol, { fundamentals, fetchedAt: Date.now() });
  await writeStaleCache(supabase, `fundamentals:${symbol}`, fundamentals);
  return fundamentals;
}

export async function getStaleUpstoxFundamentals(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<StaleEntry<CompanyFundamentals> | null> {
  return readStaleCache<CompanyFundamentals>(supabase, `fundamentals:${symbol}`);
}

// Upstox doesn't document a fixed enum of key-ratio names, so find the P/E
// entry by fuzzy match rather than relying on an exact, unverified label.
export function getPeHistory(fundamentals: CompanyFundamentals): { date: string; value: number }[] | null {
  const peRatio = fundamentals.keyRatios.find((r) => /p\s*\/?\s*e\s*ratio|^pe$/i.test(r.name));
  if (!peRatio?.history?.length) return null;
  return peRatio.history.map((h) => ({ date: h.period, value: h.value }));
}

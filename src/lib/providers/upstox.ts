import { SupabaseClient } from "@supabase/supabase-js";
import { getValidUpstoxAccessToken } from "@/lib/upstoxToken";
import { getInstrumentKeys, getInstrumentKey, getIsin, lookupByInstrumentKey } from "@/lib/providers/instruments";
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

export async function getUpstoxQuotes(
  supabase: SupabaseClient<Database>,
  symbols: string[]
): Promise<Record<string, LiveQuote>> {
  const accessToken = await getValidUpstoxAccessToken(supabase);
  if (!accessToken || symbols.length === 0) return {};

  let instrumentMap: Map<string, string>;
  try {
    instrumentMap = await getInstrumentKeys(symbols);
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
      const prevClose = entry.prev_ohlc?.close ?? entry.live_ohlc.close;
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

export async function getUpstoxFullQuote(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<FullQuote | null> {
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

    return {
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
  } catch {
    return null;
  }
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
// most — caching them avoids re-fetching the same multi-year history on
// every tab switch. 1D/1W/1M stay live (no cache) since intraday/recent
// candles are still moving during market hours.
const CACHEABLE_RANGES = new Set<TrendRange>(["1Y", "5Y"]);
const CANDLE_CACHE_TTL_MS = 60 * 60 * 1000;
const candleCache = new Map<string, { candles: CandlePoint[]; fetchedAt: number }>();

export async function getUpstoxHistoricalCandles(
  supabase: SupabaseClient<Database>,
  symbol: string,
  range: TrendRange
): Promise<CandlePoint[]> {
  const cacheKey = `${symbol}:${range}`;
  if (CACHEABLE_RANGES.has(range)) {
    const cached = candleCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CANDLE_CACHE_TTL_MS) return cached.candles;
  }

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

    if (CACHEABLE_RANGES.has(range) && candles.length > 0) {
      candleCache.set(cacheKey, { candles, fetchedAt: Date.now() });
    }

    return candles;
  } catch {
    return [];
  }
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

export async function getUpstoxFundamentals(
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
  }));

  const shareholding: ShareholdingSlice[] = (shareholdingData ?? [])
    .map((s) => {
      const latest = s.history?.[0];
      return latest
        ? { category: humanizeShareholdingCategory(s.category ?? ""), percent: latest.value, period: latest.period }
        : null;
    })
    .filter((s): s is ShareholdingSlice => s !== null);

  const corporateActions: CorporateAction[] = (corporateActionsData ?? []).slice(0, 20).map((a) => ({
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

  return { profile, keyRatios, shareholding, corporateActions, competitors };
}

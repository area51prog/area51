import zlib from "zlib";
import { Exchange } from "@/lib/types";

const INSTRUMENT_URLS: Record<Exchange, string> = {
  NSE: "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz",
  BSE: "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz",
};

// Non-equity instrument_type codes present in the *_EQ segments: corporate
// bonds (F), government securities (G), rights entitlements (R) and
// fractional-ownership/InvIT units (IF). Everything else in the EQ segment
// is an ordinary listed share (including SME board listings).
const NON_EQUITY_TYPES = new Set(["F", "G", "R", "IF"]);

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface SearchableInstrument {
  symbol: string;
  name: string;
  exchange: Exchange;
}

interface CachedInstrument extends SearchableInstrument {
  instrumentKey: string;
}

interface RawInstrument {
  segment: string;
  instrument_type: string;
  trading_symbol: string;
  name: string;
  instrument_key: string;
}

const cache: Record<Exchange, { list: CachedInstrument[]; fetchedAt: number } | null> = {
  NSE: null,
  BSE: null,
};

async function loadExchange(exchange: Exchange): Promise<CachedInstrument[]> {
  const cached = cache[exchange];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.list;

  const res = await fetch(INSTRUMENT_URLS[exchange], { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${exchange} instrument master: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const raw: RawInstrument[] = JSON.parse(zlib.gunzipSync(buf).toString("utf-8"));

  const seen = new Set<string>();
  const list: CachedInstrument[] = [];
  for (const inst of raw) {
    if (inst.segment !== `${exchange}_EQ`) continue;
    if (NON_EQUITY_TYPES.has(inst.instrument_type)) continue;
    if (seen.has(inst.trading_symbol)) continue;
    seen.add(inst.trading_symbol);
    list.push({ symbol: inst.trading_symbol, name: inst.name, exchange, instrumentKey: inst.instrument_key });
  }

  cache[exchange] = { list, fetchedAt: Date.now() };
  return list;
}

export async function lookupInstrument(symbol: string): Promise<SearchableInstrument | null> {
  const target = symbol.trim().toUpperCase();
  if (!target) return null;

  const [nse, bse] = await Promise.all([loadExchange("NSE"), loadExchange("BSE")]);
  const found = nse.find((i) => i.symbol === target) ?? bse.find((i) => i.symbol === target);
  return found ? { symbol: found.symbol, name: found.name, exchange: found.exchange } : null;
}

export async function lookupByInstrumentKey(instrumentKey: string): Promise<SearchableInstrument | null> {
  const [nse, bse] = await Promise.all([loadExchange("NSE"), loadExchange("BSE")]);
  const found = [...nse, ...bse].find((i) => i.instrumentKey === instrumentKey);
  return found ? { symbol: found.symbol, name: found.name, exchange: found.exchange } : null;
}

// Equity instrument keys are "<EXCHANGE>_EQ|<ISIN>", so the ISIN is the second
// segment. Resolves an ISIN (as it appears in broker tradebook exports) back to
// the app's canonical trading symbol. NSE is preferred when dual-listed.
export async function lookupByIsin(isin: string): Promise<SearchableInstrument | null> {
  const target = isin.trim().toUpperCase();
  if (!target) return null;
  const [nse, bse] = await Promise.all([loadExchange("NSE"), loadExchange("BSE")]);
  const match = (i: CachedInstrument) => i.instrumentKey.split("|")[1] === target;
  const found = nse.find(match) ?? bse.find(match);
  return found ? { symbol: found.symbol, name: found.name, exchange: found.exchange } : null;
}

// Batch ISIN → symbol resolution over a single pass of the instrument master.
export async function resolveByIsins(isins: string[]): Promise<Map<string, SearchableInstrument>> {
  const wanted = new Set(isins.map((i) => i.trim().toUpperCase()).filter(Boolean));
  const out = new Map<string, SearchableInstrument>();
  if (wanted.size === 0) return out;
  const [nse, bse] = await Promise.all([loadExchange("NSE"), loadExchange("BSE")]);
  for (const inst of [...nse, ...bse]) {
    const isin = inst.instrumentKey.split("|")[1];
    if (isin && wanted.has(isin) && !out.has(isin)) {
      out.set(isin, { symbol: inst.symbol, name: inst.name, exchange: inst.exchange });
    }
  }
  return out;
}

// Used by quote providers to resolve trading symbols to Upstox instrument
// keys without re-fetching the instrument master they already share here.
// Callers sometimes already have a fully-qualified instrument key (e.g.
// index keys like "NSE_INDEX|Nifty Bank", which live outside the *_EQ
// segments this module indexes) — those are passed through unresolved
// rather than being looked up, since they're not in the equity list at all.
export async function getInstrumentKeys(symbols: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const toResolve: string[] = [];
  for (const s of symbols) {
    if (s.includes("|")) map.set(s, s);
    else toResolve.push(s);
  }
  if (toResolve.length === 0) return map;

  const wanted = new Set(toResolve);
  const [nse, bse] = await Promise.all([loadExchange("NSE"), loadExchange("BSE")]);
  for (const inst of [...nse, ...bse]) {
    if (wanted.has(inst.symbol) && !map.has(inst.symbol)) map.set(inst.symbol, inst.instrumentKey);
  }
  return map;
}

export async function getInstrumentKey(symbol: string): Promise<string | null> {
  if (symbol.includes("|")) return symbol;
  const map = await getInstrumentKeys([symbol]);
  return map.get(symbol) ?? null;
}

// Equity instrument keys are formatted "<EXCHANGE>_EQ|<ISIN>" — the
// fundamentals API is ISIN-keyed, so this just strips the exchange prefix.
export async function getIsin(symbol: string): Promise<string | null> {
  const key = await getInstrumentKey(symbol);
  if (!key) return null;
  const isin = key.split("|")[1];
  return isin ?? null;
}

export async function searchInstruments(query: string, limit = 8): Promise<SearchableInstrument[]> {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const [nse, bse] = await Promise.all([loadExchange("NSE"), loadExchange("BSE")]);
  const all = [...nse, ...bse];

  const symbolMatches: SearchableInstrument[] = [];
  const nameMatches: SearchableInstrument[] = [];
  for (const inst of all) {
    if (inst.symbol.startsWith(q)) symbolMatches.push(inst);
    else if (inst.name.toUpperCase().includes(q)) nameMatches.push(inst);
  }

  symbolMatches.sort((a, b) => a.symbol.length - b.symbol.length || a.symbol.localeCompare(b.symbol));
  nameMatches.sort((a, b) => a.name.localeCompare(b.name));

  // Prefer NSE over BSE when the same symbol is dual-listed.
  const deduped: SearchableInstrument[] = [];
  const seenSymbols = new Set<string>();
  for (const inst of [...symbolMatches, ...nameMatches]) {
    if (seenSymbols.has(inst.symbol)) continue;
    seenSymbols.add(inst.symbol);
    deduped.push({ symbol: inst.symbol, name: inst.name, exchange: inst.exchange });
    if (deduped.length >= limit) break;
  }

  return deduped;
}

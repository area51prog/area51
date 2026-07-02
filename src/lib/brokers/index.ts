import { parseCsv } from "@/lib/csv";
import { BrokerAdapter, CanonicalTrade, BrokerRowError } from "./types";
import { nativeAdapter } from "./native";
import { zerodhaAdapter } from "./zerodha";
import { growwAdapter } from "./groww";
import { upstoxAdapter } from "./upstox";
import { angelOneAdapter } from "./angelone";
import { iciciAdapter } from "./icici";

export type { CanonicalTrade, BrokerRowError } from "./types";

// Order matters — detection is first-match-wins, so the most specific /
// verified signatures (native, Zerodha) come first.
const ADAPTERS: BrokerAdapter[] = [
  nativeAdapter,
  zerodhaAdapter,
  growwAdapter,
  angelOneAdapter,
  iciciAdapter,
  upstoxAdapter,
];

export const SUPPORTED_BROKER_NAMES = ["Zerodha", "Groww", "Upstox", "Angel One", "ICICI Direct"];

export interface NormalizeResult {
  brokerId: string | null;
  brokerName: string | null;
  trades: CanonicalTrade[];
  errors: BrokerRowError[];
}

function detectAdapter(header: string[]): BrokerAdapter | null {
  const normalized = header.map((h) => h.trim().toLowerCase());
  return ADAPTERS.find((a) => a.detect(normalized)) ?? null;
}

// Collapse partial fills into one trade per order. Trades of the same order
// (or, when no order id, the same symbol+side+date) are merged: quantities
// sum and the price becomes the quantity-weighted average.
export function aggregateFills(trades: CanonicalTrade[]): CanonicalTrade[] {
  const groups = new Map<string, { base: CanonicalTrade; qty: number; notional: number }>();
  for (const t of trades) {
    const key = t.orderId
      ? `o:${t.orderId}:${t.side}`
      : `s:${t.brokerSymbol}:${t.side}:${t.tradeDate}`;
    const existing = groups.get(key);
    if (existing) {
      existing.qty += t.quantity;
      existing.notional += t.quantity * t.price;
      // Prefer keeping an ISIN/exchange if a later fill carries one the first lacked.
      if (!existing.base.isin && t.isin) existing.base.isin = t.isin;
      if (!existing.base.exchange && t.exchange) existing.base.exchange = t.exchange;
    } else {
      groups.set(key, { base: { ...t }, qty: t.quantity, notional: t.quantity * t.price });
    }
  }
  return Array.from(groups.values()).map(({ base, qty, notional }) => ({
    ...base,
    quantity: qty,
    price: qty > 0 ? notional / qty : base.price,
  }));
}

// Parse a broker CSV into aggregated canonical trades. Detects the broker from
// the header; returns an "unrecognised" error when no adapter matches.
export function normalizeCsv(text: string): NormalizeResult {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { brokerId: null, brokerName: null, trades: [], errors: [{ row: 0, message: "The file is empty." }] };
  }

  const adapter = detectAdapter(rows[0]);
  if (!adapter) {
    return {
      brokerId: null,
      brokerName: null,
      trades: [],
      errors: [{ row: 1, message: `Unrecognised CSV format. Supported: ${SUPPORTED_BROKER_NAMES.join(", ")}, or the Alloqo template.` }],
    };
  }

  const { trades, errors } = adapter.parse(rows);
  return {
    brokerId: adapter.id,
    brokerName: adapter.name,
    trades: aggregateFills(trades),
    errors,
  };
}

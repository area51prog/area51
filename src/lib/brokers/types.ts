import { Exchange } from "@/lib/types";

// A single normalized trade, broker-agnostic. Partial fills from a broker
// export are aggregated into one CanonicalTrade per order before this is
// surfaced to the UI (see aggregateFills in ./index).
export interface CanonicalTrade {
  brokerSymbol: string; // symbol exactly as the broker wrote it (uppercased)
  isin: string | null; // ISIN when the broker provides it — the reliable cross-broker join
  exchange: Exchange | null;
  side: "buy" | "sell";
  quantity: number;
  price: number; // per-share price (weighted average once fills are aggregated)
  tradeDate: string; // YYYY-MM-DD
  orderId: string | null; // used to group partial fills of the same order
}

export interface BrokerRowError {
  row: number; // 1-based line number in the source file (header = row 1)
  message: string;
}

export interface BrokerAdapter {
  id: string;
  name: string;
  // Returns true when the (lowercased, trimmed) header row looks like this broker.
  detect(header: string[]): boolean;
  // Parses data rows (rows[0] is the header) into canonical trades. Non-equity
  // rows (F&O) should be skipped with a BrokerRowError so the UI can explain it.
  parse(rows: string[][]): { trades: CanonicalTrade[]; errors: BrokerRowError[] };
}

import { Exchange } from "@/lib/types";

// Shared column-parsing helpers used by the broker adapters. Broker exports
// differ in header names and value formats, but the primitive conversions
// (dates, numbers, side, exchange) are common enough to centralize here.

// Build a lookup from a header row so adapters can read columns by name
// regardless of ordering. Header cells are matched case-insensitively.
export function headerIndex(header: string[]): (...names: string[]) => number {
  const map = new Map<string, number>();
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (!map.has(key)) map.set(key, i);
  });
  return (...names: string[]) => {
    for (const n of names) {
      const idx = map.get(n.trim().toLowerCase());
      if (idx !== undefined) return idx;
    }
    return -1;
  };
}

export function cell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  return (row[idx] ?? "").trim();
}

// Parse a numeric cell, tolerating thousands separators and stray currency
// symbols (e.g. "1,234.50", "₹1,234.50").
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, "");
  return Number(cleaned);
}

// Normalize a broker date into YYYY-MM-DD. Handles ISO dates/datetimes
// ("2026-06-08", "2026-06-08T14:29:58") and common Indian formats
// ("08-06-2026", "08/06/2026", "08-Jun-2026").
export function normalizeDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  // ISO date or datetime — take the date part.
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }

  // DD-Mon-YYYY (e.g. 08-Jun-2026)
  const dMonY = v.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})/);
  if (dMonY) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const m = months[dMonY[2].toLowerCase()];
    if (m) return `${dMonY[3]}-${m}-${dMonY[1].padStart(2, "0")}`;
  }

  return null;
}

export function normalizeSide(value: string): "buy" | "sell" | null {
  const v = value.trim().toLowerCase();
  if (v === "buy" || v === "b" || v === "bought" || v === "purchase") return "buy";
  if (v === "sell" || v === "s" || v === "sold") return "sell";
  return null;
}

export function normalizeExchange(value: string): Exchange | null {
  const v = value.trim().toUpperCase();
  if (v.includes("NSE")) return "NSE";
  if (v.includes("BSE")) return "BSE";
  return null;
}

// True when a segment/series looks like a cash-equity trade (as opposed to
// F&O). The portfolio model is equity-only, so adapters skip everything else.
export function isEquitySegment(segment: string): boolean {
  const s = segment.trim().toUpperCase();
  if (!s) return true; // no segment column — assume equity
  return s.endsWith("EQ") || s === "EQUITY" || s === "CASH" || s === "E";
}

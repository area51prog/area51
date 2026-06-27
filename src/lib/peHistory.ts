import { Stock } from "./types";

// The 14 hardcoded demo stocks only ever have a single current P/E snapshot,
// not a real history. Approximate one by rescaling the existing price line
// by the implied constant (currentPeRatio / currentPrice) — same shape as
// the price line, just on a P/E-sized axis. Good enough for a demo toggle.
export function derivePeHistory(stock: Stock): { date: string; value: number }[] | null {
  if (stock.peRatio == null || !stock.price) return null;
  const k = stock.peRatio / stock.price;
  return stock.history.map((h) => ({ date: h.date, value: h.price * k }));
}

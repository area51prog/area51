// Sector lookup for analytics (allocation-by-sector, etc). Mirrors the
// per-stock `sector` field already on the 14 mock STOCKS in mock-data.ts,
// plus a best-effort fallback for real holdings outside that set.
export const SECTOR_MAP: Record<string, string> = {
  CIPLA: "Pharmaceuticals",
  SUNPHARMA: "Pharmaceuticals",
  LUPIN: "Pharmaceuticals",
  DRREDDY: "Pharmaceuticals",
  RELIANCE: "Energy / Conglomerate",
  TCS: "IT Services",
  INFY: "IT Services",
  HDFCBANK: "Banking",
  ICICIBANK: "Banking",
  ITC: "FMCG",
  SBIN: "Banking",
  BHARTIARTL: "Telecom",
  MARUTI: "Automobile",
  ASIANPAINT: "Consumer / Paints",
};

export const UNKNOWN_SECTOR = "Diversified/Other";

export function getSector(symbol: string): string {
  return SECTOR_MAP[symbol] ?? UNKNOWN_SECTOR;
}

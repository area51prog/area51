import {
  ResearchReport,
  Stock,
} from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function genHistory(base: number, drift: number, points = 12) {
  let p = base;
  return Array.from({ length: points }, (_, i) => {
    const seed = Math.sin(i * 12.9898 + base) * 43758.5453;
    const noise = (seed - Math.floor(seed) - 0.5) * 2;
    p = p * (1 + drift / points) + noise * base * 0.015;
    return { date: MONTHS[i % 12], price: Math.round(p * 100) / 100 };
  });
}

export type PortfolioRange = "1D" | "1W" | "1M" | "1Y" | "5Y";

const PORTFOLIO_RANGE_CONFIG: Record<PortfolioRange, { labels: string[]; volatility: number }> = {
  "1D": { labels: ["9:15", "10:15", "11:15", "12:15", "1:15", "2:15", "3:30"], volatility: 0.004 },
  "1W": { labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], volatility: 0.012 },
  "1M": { labels: Array.from({ length: 4 }, (_, i) => `Wk ${i + 1}`), volatility: 0.02 },
  "1Y": { labels: MONTHS, volatility: 0.03 },
  "5Y": { labels: Array.from({ length: 5 }, (_, i) => `${new Date().getFullYear() - 4 + i}`), volatility: 0.08 },
};

export function getPortfolioHistory(currentValue: number, range: PortfolioRange) {
  const { labels, volatility } = PORTFOLIO_RANGE_CONFIG[range];
  let p = 1;
  const multipliers = labels.map((_, i) => {
    const seed = Math.sin(i * 12.9898 + currentValue) * 43758.5453;
    const noise = (seed - Math.floor(seed) - 0.5) * 2;
    p = p * (1 + noise * volatility);
    return p;
  });
  const last = multipliers[multipliers.length - 1] || 1;
  return labels.map((date, i) => ({
    date,
    price: Math.round((multipliers[i] / last) * currentValue * 100) / 100,
  }));
}

function stock(
  symbol: string,
  name: string,
  exchange: "NSE" | "BSE",
  sector: string,
  price: number,
  prevClose: number,
  marketCapCr: number,
  peRatio: number | null,
  drift: number
): Stock {
  const history = genHistory(price * 0.85, drift);
  return {
    symbol,
    name,
    exchange,
    sector,
    price,
    prevClose,
    dayHigh: Math.round(price * 1.012 * 100) / 100,
    dayLow: Math.round(price * 0.986 * 100) / 100,
    week52High: Math.round(price * 1.28 * 100) / 100,
    week52Low: Math.round(price * 0.74 * 100) / 100,
    marketCapCr,
    peRatio,
    history,
  };
}

export const STOCKS: Stock[] = [
  stock("CIPLA", "Cipla Ltd", "NSE", "Pharmaceuticals", 1295.4, 1288.1, 104750, 27.1, 0.18),
  stock("SUNPHARMA", "Sun Pharmaceutical Industries", "NSE", "Pharmaceuticals", 1812.6, 1798.2, 434900, 38.2, 0.22),
  stock("LUPIN", "Lupin Ltd", "NSE", "Pharmaceuticals", 2143.0, 2129.5, 97650, 24.8, 0.3),
  stock("DRREDDY", "Dr Reddy's Laboratories", "NSE", "Pharmaceuticals", 1342.8, 1351.6, 112300, 19.4, 0.12),
  stock("RELIANCE", "Reliance Industries Ltd", "NSE", "Energy / Conglomerate", 2987.5, 2965.0, 2018700, 25.6, 0.15),
  stock("TCS", "Tata Consultancy Services", "NSE", "IT Services", 4128.9, 4151.2, 1493800, 28.4, 0.08),
  stock("INFY", "Infosys Ltd", "NSE", "IT Services", 1879.3, 1862.7, 780200, 26.1, 0.1),
  stock("HDFCBANK", "HDFC Bank Ltd", "NSE", "Banking", 1742.2, 1735.9, 1331500, 20.3, 0.2),
  stock("ICICIBANK", "ICICI Bank Ltd", "NSE", "Banking", 1298.6, 1289.4, 913400, 18.9, 0.24),
  stock("ITC", "ITC Ltd", "NSE", "FMCG", 468.3, 471.0, 585200, 27.9, -0.05),
  stock("SBIN", "State Bank of India", "NSE", "Banking", 832.7, 818.5, 742600, 11.2, 0.28),
  stock("BHARTIARTL", "Bharti Airtel Ltd", "NSE", "Telecom", 1689.4, 1672.8, 1015300, 41.7, 0.34),
  stock("MARUTI", "Maruti Suzuki India Ltd", "NSE", "Automobile", 12845.0, 12790.5, 403900, 29.5, 0.11),
  stock("ASIANPAINT", "Asian Paints Ltd", "NSE", "Consumer / Paints", 2456.1, 2470.8, 235500, 48.3, -0.08),
];

export function getStock(symbol: string) {
  return STOCKS.find((s) => s.symbol === symbol);
}

// Finnhub identifies NSE-listed stocks with a ".NS" suffix, distinct from
// the plain symbols (CIPLA, TCS, ...) used throughout this app's UI/URLs.
export const FINNHUB_SYMBOL_MAP: Record<string, string> = {
  CIPLA: "CIPLA.NS",
  SUNPHARMA: "SUNPHARMA.NS",
  LUPIN: "LUPIN.NS",
  DRREDDY: "DRREDDY.NS",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  INFY: "INFY.NS",
  HDFCBANK: "HDFCBANK.NS",
  ICICIBANK: "ICICIBANK.NS",
  ITC: "ITC.NS",
  SBIN: "SBIN.NS",
  BHARTIARTL: "BHARTIARTL.NS",
  MARUTI: "MARUTI.NS",
  ASIANPAINT: "ASIANPAINT.NS",
};

export function toFinnhubSymbol(symbol: string) {
  return FINNHUB_SYMBOL_MAP[symbol] ?? symbol;
}


export const RESEARCH_REPORTS: ResearchReport[] = [
  {
    symbol: "CIPLA",
    generatedOn: "2026-06-20",
    rating: "HOLD",
    targetPrice: 1400,
    currentPrice: 1295,
    upsidePct: 8,
    summary:
      "Cipla is a high-quality, conservatively financed franchise — #3 in Indian Rx, #1 in respiratory, net cash — but FY26 was a genuine earnings reset (PAT –26%) on a transient US supply shock plus a tapering gRevlimid base. At ~27x trailing FY26 the stock already discounts a smooth FY27 recovery. Our DCF fair value (~₹1,236) sits close to the market; a blended ₹1,400 target implies only high-single-digit upside.",
    scenarios: [
      { name: "Bull", target: 1650, returnPct: 27, desc: "Lanreotide resolves early; gAdvair + GLP-1 scale; margins rebuild to 25%+; re-rate to ~27x FY27E EPS." },
      { name: "Base", target: 1400, returnPct: 8, desc: "Gradual US recovery H2FY27; India compounds ~10%; EBITDA margin ~24%; ~22–23x FY27E EPS." },
      { name: "Bear", target: 1050, returnPct: -19, desc: "Prolonged supply disruption; deeper US erosion; margins stuck ~21%; de-rate to ~18x; Goa 483 escalates." },
    ],
    kpis: [
      { label: "P/E (FY26 / FY25)", value: "27x / 20x", note: "Below Sun, ~ Lupin" },
      { label: "EV/EBITDA (FY26)", value: "~16x", note: "~13x on FY27E" },
      { label: "ROE (FY26 / FY25)", value: "11.8% / 17.8%", note: "Reset year" },
      { label: "Net Cash", value: "~₹9,000 cr", note: "Debt-free" },
    ],
    catalysts: [
      "Lanreotide supply resumption at partner Pharmathen — biggest swing factor for FY27.",
      "US launches: gAdvair + 3 respiratory, gVictoza (GLP-1), 3 peptides, Ventolin HFA generic (H1FY27).",
      "Q1FY27 results — US run-rate, margin trajectory, updated guidance.",
    ],
    risks: [
      "US supply / lanreotide disruption into H1FY27; margin guidance cut 175–300bps.",
      "gRevlimid taper — high-margin US base rolling off.",
      "USFDA: two Form 483s at Goa (Apr-26) — escalation risk.",
      "GLP-1 / pricing / FX exposure on ~24% US revenue.",
    ],
    dcf: [
      { label: "Horizon", value: "FY27–FY31 + terminal" },
      { label: "Revenue CAGR", value: "~9%" },
      { label: "WACC", value: "10.5%" },
      { label: "Terminal growth", value: "5.5%" },
      { label: "Implied fair value", value: "~₹1,236 / share" },
    ],
  },
];

export function getResearch(symbol: string) {
  return RESEARCH_REPORTS.find((r) => r.symbol === symbol);
}

export function generateMockReport(symbol: string): ResearchReport {
  const s = getStock(symbol)!;
  const yearReturn = (s.history[s.history.length - 1].price - s.history[0].price) / s.history[0].price;
  const rating: ResearchReport["rating"] = yearReturn > 0.18 ? "BUY" : yearReturn > 0.02 ? "HOLD" : "REDUCE";
  const upsidePct = Math.round((rating === "BUY" ? 16 : rating === "HOLD" ? 7 : -8) + yearReturn * 10);
  const targetPrice = Math.round(s.price * (1 + upsidePct / 100));

  return {
    symbol: s.symbol,
    generatedOn: new Date().toISOString().slice(0, 10),
    rating,
    targetPrice,
    currentPrice: s.price,
    upsidePct,
    summary: `${s.name} (${s.symbol}) trades at ${s.peRatio ? s.peRatio.toFixed(1) + "x" : "n/a"} trailing earnings within the ${s.sector} sector. Based on recent price momentum and sector positioning, this is a preliminary AI-generated read — initiate at ${rating} with a 12-month fair value of ₹${targetPrice.toLocaleString("en-IN")}.`,
    scenarios: [
      { name: "Bull", target: Math.round(targetPrice * 1.18), returnPct: Math.round(upsidePct * 1.7 + 12), desc: "Earnings growth accelerates, margins expand, re-rating versus sector peers." },
      { name: "Base", target: targetPrice, returnPct: upsidePct, desc: "Earnings track current consensus; multiple holds near current levels." },
      { name: "Bear", target: Math.round(targetPrice * 0.8), returnPct: Math.round(upsidePct - 22), desc: "Demand or margin pressure, de-rating versus historical average multiple." },
    ],
    kpis: [
      { label: "P/E ratio", value: s.peRatio ? `${s.peRatio.toFixed(1)}x` : "—" },
      { label: "Market cap", value: `₹${s.marketCapCr.toLocaleString("en-IN")} cr` },
      { label: "52w range", value: `₹${s.week52Low.toFixed(0)} – ₹${s.week52High.toFixed(0)}` },
      { label: "Sector", value: s.sector },
    ],
    catalysts: [
      "Upcoming quarterly results and management commentary on demand trends.",
      "Sector-wide re-rating if peer earnings surprise positively.",
      "Potential capacity expansion or new product/segment launches.",
    ],
    risks: [
      "Margin pressure from input costs or competitive intensity.",
      "Broader market multiple compression in a risk-off environment.",
      "Regulatory or policy changes specific to the sector.",
    ],
    dcf: [
      { label: "Horizon", value: "FY27–FY31 + terminal" },
      { label: "WACC", value: "11.0%" },
      { label: "Terminal growth", value: "5.0%" },
      { label: "Implied fair value", value: `~₹${targetPrice.toLocaleString("en-IN")} / share` },
    ],
  };
}

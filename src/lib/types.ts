export type Exchange = "NSE" | "BSE";

export type QuoteSource = "upstox" | "finnhub" | "mock";

export interface LiveQuote {
  price: number;
  change: number | null;
  changePercent: number | null;
  high: number;
  low: number;
  prevClose: number;
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: string;
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  marketCapCr: number;
  peRatio: number | null;
  history: { date: string; price: number }[];
}

export interface WatchlistEntry {
  symbol: string;
}

export interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  buyDate: string;
}

export interface DividendEvent {
  symbol: string;
  exDate: string;
  paymentDate: string;
  amountPerShare: number;
  type: "Interim" | "Final" | "Special";
}

export type Rating = "BUY" | "HOLD" | "REDUCE" | "SELL";

export interface ScenarioTarget {
  name: "Bull" | "Base" | "Bear";
  target: number;
  returnPct: number;
  desc: string;
}

export interface ResearchReport {
  symbol: string;
  generatedOn: string;
  rating: Rating;
  targetPrice: number;
  currentPrice: number;
  upsidePct: number;
  summary: string;
  scenarios: ScenarioTarget[];
  kpis: { label: string; value: string; note?: string }[];
  catalysts: string[];
  risks: string[];
  dcf: { label: string; value: string }[];
}

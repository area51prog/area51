import { LiveQuote, Stock } from "./types";

export function withLiveQuote(stock: Stock, quote?: LiveQuote): Stock {
  if (!quote) return stock;
  return {
    ...stock,
    price: quote.price,
    prevClose: quote.prevClose,
    dayHigh: quote.high,
    dayLow: quote.low,
  };
}

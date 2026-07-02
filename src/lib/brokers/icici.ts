import { makeTradebookAdapter } from "./genericTradebook";

// ICICI Direct → Trade Book export. Header signature is best-effort (verify
// against a real export): ICICI Direct uses spaced Title Case labels such as
// "Stock Symbol"/"Company Name", "Action" (Buy/Sell) and "Trade Date".
export const iciciAdapter = makeTradebookAdapter({
  id: "icici",
  name: "ICICI Direct",
  detect(header) {
    const set = new Set(header);
    const hasSymbol = set.has("stock symbol") || set.has("company name") || set.has("stock_code");
    const hasSide = set.has("action") || set.has("buy/sell") || set.has("transaction type");
    return hasSymbol && hasSide;
  },
});

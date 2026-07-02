import { makeTradebookAdapter } from "./genericTradebook";

// Angel One → Reports → Trade Book export. Header signature is best-effort
// (verify against a real export): Angel One uses `trading_symbol` with a
// `transaction_type` (BUY/SELL) column and a `symbol_token`.
export const angelOneAdapter = makeTradebookAdapter({
  id: "angelone",
  name: "Angel One",
  detect(header) {
    const set = new Set(header);
    const hasSymbol = set.has("trading_symbol") || set.has("tradingsymbol") || set.has("symbol_name");
    const hasSide = set.has("transaction_type") || set.has("transaction type");
    return hasSymbol && hasSide;
  },
});

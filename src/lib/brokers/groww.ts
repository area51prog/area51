import { makeTradebookAdapter } from "./genericTradebook";

// Groww → Reports → Order/Trade history export. Header signature is
// best-effort (verify against a real export): Groww's tradebook mirrors the
// Zerodha-style layout but timestamps the order as `order_timestamp`, which
// lets us disambiguate it from Zerodha's `order_execution_time`.
export const growwAdapter = makeTradebookAdapter({
  id: "groww",
  name: "Groww",
  detect(header) {
    const set = new Set(header);
    return set.has("isin") && (set.has("order_timestamp") || (set.has("stock_name") && set.has("trade_type")));
  },
});

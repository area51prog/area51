import { makeTradebookAdapter } from "./genericTradebook";

// Upstox → Reports → Tradebook export. Header signature is best-effort
// (verify against a real export): Upstox uses Title Case labels such as
// "Company", "Trade Date", "Trade Type", "Scrip Code".
export const upstoxAdapter = makeTradebookAdapter({
  id: "upstox",
  name: "Upstox",
  detect(header) {
    const set = new Set(header);
    const hasSide = set.has("trade type") || set.has("transaction type");
    const hasDate = set.has("trade date");
    const hasSymbol = set.has("company") || set.has("scrip") || set.has("scrip_name");
    return hasDate && hasSide && hasSymbol;
  },
});

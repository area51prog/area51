import { BrokerAdapter, CanonicalTrade, BrokerRowError } from "./types";
import { headerIndex, cell, parseNumber, normalizeDate } from "./columns";

// Alloqo's own template — the format the bulk uploader accepted before broker
// support. Header: symbol,quantity,avgPrice,buyDate. Every row is a buy lot.
export const nativeAdapter: BrokerAdapter = {
  id: "native",
  name: "Alloqo template",

  detect(header) {
    const set = new Set(header);
    return set.has("symbol") && set.has("quantity") && set.has("avgprice") && set.has("buydate");
  },

  parse(rows) {
    const trades: CanonicalTrade[] = [];
    const errors: BrokerRowError[] = [];
    if (rows.length === 0) return { trades, errors };

    const at = headerIndex(rows[0]);
    const cSymbol = at("symbol");
    const cQty = at("quantity");
    const cPrice = at("avgprice");
    const cDate = at("buydate");

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;

      const brokerSymbol = cell(r, cSymbol).toUpperCase();
      const quantity = parseNumber(cell(r, cQty));
      const price = parseNumber(cell(r, cPrice));
      const tradeDate = normalizeDate(cell(r, cDate));

      if (!brokerSymbol) { errors.push({ row: rowNum, message: "Symbol is required." }); continue; }
      if (!Number.isFinite(quantity) || quantity <= 0) { errors.push({ row: rowNum, message: "Quantity must be a positive number." }); continue; }
      if (!Number.isFinite(price) || price < 0) { errors.push({ row: rowNum, message: "Avg. price must be a non-negative number." }); continue; }
      if (!tradeDate) { errors.push({ row: rowNum, message: "Buy date is invalid. Use YYYY-MM-DD." }); continue; }

      trades.push({ brokerSymbol, isin: null, exchange: null, side: "buy", quantity, price, tradeDate, orderId: null });
    }

    return { trades, errors };
  },
};

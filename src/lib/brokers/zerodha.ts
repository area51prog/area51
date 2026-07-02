import { BrokerAdapter, CanonicalTrade, BrokerRowError } from "./types";
import { headerIndex, cell, parseNumber, normalizeDate, normalizeSide, normalizeExchange, isEquitySegment } from "./columns";

// Zerodha Console → Reports → Tradebook (equity) export. Header:
// symbol,isin,trade_date,exchange,segment,series,trade_type,auction,
// quantity,price,trade_id,order_id,order_execution_time
export const zerodhaAdapter: BrokerAdapter = {
  id: "zerodha",
  name: "Zerodha",

  detect(header) {
    const set = new Set(header);
    return set.has("symbol") && set.has("isin") && set.has("trade_type") && set.has("trade_date") && set.has("order_id");
  },

  parse(rows) {
    const trades: CanonicalTrade[] = [];
    const errors: BrokerRowError[] = [];
    if (rows.length === 0) return { trades, errors };

    const at = headerIndex(rows[0]);
    const cSymbol = at("symbol");
    const cIsin = at("isin");
    const cDate = at("trade_date", "order_execution_time");
    const cExchange = at("exchange");
    const cSegment = at("segment");
    const cSide = at("trade_type");
    const cQty = at("quantity");
    const cPrice = at("price");
    const cOrder = at("order_id");

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;

      if (!isEquitySegment(cell(r, cSegment))) {
        errors.push({ row: rowNum, message: `Skipped non-equity row (segment "${cell(r, cSegment)}").` });
        continue;
      }

      const brokerSymbol = cell(r, cSymbol).toUpperCase();
      const side = normalizeSide(cell(r, cSide));
      const quantity = parseNumber(cell(r, cQty));
      const price = parseNumber(cell(r, cPrice));
      const tradeDate = normalizeDate(cell(r, cDate));

      if (!brokerSymbol) { errors.push({ row: rowNum, message: "Missing symbol." }); continue; }
      if (!side) { errors.push({ row: rowNum, message: `Unrecognised trade type "${cell(r, cSide)}".` }); continue; }
      if (!Number.isFinite(quantity) || quantity <= 0) { errors.push({ row: rowNum, message: "Invalid quantity." }); continue; }
      if (!Number.isFinite(price) || price < 0) { errors.push({ row: rowNum, message: "Invalid price." }); continue; }
      if (!tradeDate) { errors.push({ row: rowNum, message: "Invalid trade date." }); continue; }

      trades.push({
        brokerSymbol,
        isin: cell(r, cIsin) || null,
        exchange: normalizeExchange(cell(r, cExchange)),
        side,
        quantity,
        price,
        tradeDate,
        orderId: cell(r, cOrder) || null,
      });
    }

    return { trades, errors };
  },
};

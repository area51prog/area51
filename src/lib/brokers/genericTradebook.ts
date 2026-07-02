import { BrokerAdapter, CanonicalTrade, BrokerRowError } from "./types";
import { headerIndex, cell, parseNumber, normalizeDate, normalizeSide, normalizeExchange, isEquitySegment } from "./columns";

// Most Indian broker tradebook exports carry the same fields as Zerodha's —
// symbol, ISIN, date, side, quantity, price — but under different header
// labels and casings. Rather than a bespoke parser per broker, this factory
// builds an adapter from a detection predicate plus tolerant synonym-based
// column resolution. Each broker file supplies only what makes it recognisable.
//
// NOTE: the synonym lists below are best-effort. The Zerodha and native
// adapters are verified against real exports; the Groww / Upstox / Angel One /
// ICICI Direct signatures should be confirmed against a fresh export from each
// broker and adjusted here if a column label differs.

const SYMBOL_COLS = ["symbol", "trading_symbol", "tradingsymbol", "scrip", "scrip_name", "stock", "stock_name", "stock_symbol", "instrument", "company", "company_name", "security", "name"];
const ISIN_COLS = ["isin", "isin_code", "isin code"];
const DATE_COLS = ["trade_date", "trade date", "date", "order_execution_time", "order_timestamp", "trade_time", "traded_on", "transaction_date", "execution_time"];
const EXCHANGE_COLS = ["exchange", "exchange_name", "exch"];
const SEGMENT_COLS = ["segment", "series", "product", "instrument_type"];
const SIDE_COLS = ["trade_type", "transaction_type", "transaction type", "side", "buy_sell", "buy/sell", "b/s", "action", "type"];
const QTY_COLS = ["quantity", "qty", "traded_qty", "filled_quantity", "shares"];
const PRICE_COLS = ["price", "trade_price", "traded_price", "avg_price", "average_price", "rate", "trade_rate"];
const ORDER_COLS = ["order_id", "order id", "order_no", "order number", "nse_order_id", "orderid"];

export function makeTradebookAdapter(config: {
  id: string;
  name: string;
  detect: (header: string[]) => boolean;
}): BrokerAdapter {
  return {
    id: config.id,
    name: config.name,
    detect: config.detect,

    parse(rows) {
      const trades: CanonicalTrade[] = [];
      const errors: BrokerRowError[] = [];
      if (rows.length === 0) return { trades, errors };

      const at = headerIndex(rows[0]);
      const cSymbol = at(...SYMBOL_COLS);
      const cIsin = at(...ISIN_COLS);
      const cDate = at(...DATE_COLS);
      const cExchange = at(...EXCHANGE_COLS);
      const cSegment = at(...SEGMENT_COLS);
      const cSide = at(...SIDE_COLS);
      const cQty = at(...QTY_COLS);
      const cPrice = at(...PRICE_COLS);
      const cOrder = at(...ORDER_COLS);

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 1;

        if (cSegment >= 0 && !isEquitySegment(cell(r, cSegment))) {
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
          isin: cIsin >= 0 ? cell(r, cIsin) || null : null,
          exchange: normalizeExchange(cell(r, cExchange)),
          side,
          quantity,
          price,
          tradeDate,
          orderId: cOrder >= 0 ? cell(r, cOrder) || null : null,
        });
      }

      return { trades, errors };
    },
  };
}

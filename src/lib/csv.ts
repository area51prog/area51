import { NewHolding } from "./usePortfolio";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const REQUIRED_COLUMNS = ["symbol", "quantity", "avgprice", "buydate"] as const;

export interface BulkRowError {
  row: number;
  message: string;
}

export function validateBulkRows(rows: string[][]): { valid: NewHolding[]; errors: BulkRowError[] } {
  const errors: BulkRowError[] = [];
  if (rows.length === 0) return { valid: [], errors: [{ row: 0, message: "The file is empty." }] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const columnIndex: Record<string, number> = {};
  for (const col of REQUIRED_COLUMNS) {
    const idx = header.indexOf(col);
    if (idx === -1) {
      return {
        valid: [],
        errors: [{ row: 0, message: `Missing required column "${col}". Expected header: symbol,quantity,avgPrice,buyDate` }],
      };
    }
    columnIndex[col] = idx;
  }

  const valid: NewHolding[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    const symbol = (r[columnIndex.symbol] ?? "").trim().toUpperCase();
    const quantity = Number((r[columnIndex.quantity] ?? "").trim());
    const avgPrice = Number((r[columnIndex.avgprice] ?? "").trim());
    const buyDate = (r[columnIndex.buydate] ?? "").trim();

    if (!symbol) {
      errors.push({ row: rowNum, message: "Symbol is required." });
      continue;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push({ row: rowNum, message: "Quantity must be a positive number." });
      continue;
    }
    if (!Number.isFinite(avgPrice) || avgPrice < 0) {
      errors.push({ row: rowNum, message: "Avg. price must be a non-negative number." });
      continue;
    }
    if (!buyDate || Number.isNaN(new Date(buyDate).getTime())) {
      errors.push({ row: rowNum, message: "Buy date is invalid. Use YYYY-MM-DD." });
      continue;
    }

    valid.push({ symbol, quantity, avgPrice, buyDate });
  }

  return { valid, errors };
}

export function bulkUploadTemplate(): string {
  return "symbol,quantity,avgPrice,buyDate\nRELIANCE,10,2450.50,2024-01-15\n";
}

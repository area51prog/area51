import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxCorporateActionsOnly } from "@/lib/providers/upstox";
import { classifyCorporateActions } from "@/lib/corporateActions";
import { CorporateActionRow, ActionType } from "@/lib/types";

// Corporate actions are announced weeks ahead of their ex-date and don't change
// once filed, so a day-long cache avoids re-hitting 5 Upstox endpoints per symbol
// on every page load.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CorporateActionDbRow {
  symbol: string;
  action_type: string;
  sub_type: string | null;
  ex_date: string | null;
  amount: number | null;
  raw_name: string;
  details: string | null;
  fetched_at: string;
}

function toRow(r: CorporateActionDbRow): CorporateActionRow {
  return {
    symbol: r.symbol,
    actionType: r.action_type as ActionType,
    subType: r.sub_type,
    exDate: r.ex_date,
    amount: r.amount,
    rawName: r.raw_name,
    details: r.details,
  };
}

async function fetchActionsForSymbol(
  supabase: Awaited<ReturnType<typeof createClient>>,
  symbol: string
): Promise<CorporateActionRow[]> {
  const actions = await getUpstoxCorporateActionsOnly(supabase, symbol);
  return classifyCorporateActions(symbol, actions);
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) return Response.json({ ok: true, events: [] });

  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("corporate_actions")
    .select("symbol, action_type, sub_type, ex_date, amount, raw_name, details, fetched_at")
    .in("symbol", symbols);

  const freshestPerSymbol = new Map<string, string>();
  for (const row of cached ?? []) {
    const prev = freshestPerSymbol.get(row.symbol);
    if (!prev || row.fetched_at > prev) freshestPerSymbol.set(row.symbol, row.fetched_at);
  }

  const freshSymbols = new Set(
    [...freshestPerSymbol.entries()]
      .filter(([, fetchedAt]) => Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS)
      .map(([symbol]) => symbol)
  );

  const staleSymbols = symbols.filter((s) => !freshSymbols.has(s));

  const refetched = await Promise.all(
    staleSymbols.map(async (symbol) => ({ symbol, rows: await fetchActionsForSymbol(supabase, symbol) }))
  );

  if (refetched.length > 0) {
    const allInserts = refetched.flatMap(({ symbol, rows }) =>
      rows.map((r) => ({
        symbol,
        action_type: r.actionType,
        sub_type: r.subType,
        ex_date: r.exDate,
        amount: r.amount,
        raw_name: r.rawName,
        details: r.details,
        fetched_at: new Date().toISOString(),
      }))
    );
    // Upstox's own corporate-actions feed sometimes repeats the same action verbatim
    // (seen with BIRET) — ON CONFLICT DO UPDATE can't touch the same target row twice
    // in one statement, so de-dupe on the unique-constraint columns before upserting.
    const inserts = [
      ...new Map(allInserts.map((r) => [`${r.symbol}|${r.action_type}|${r.ex_date}|${r.raw_name}`, r])).values(),
    ];
    if (inserts.length > 0) {
      const { error } = await supabase
        .from("corporate_actions")
        .upsert(inserts, { onConflict: "symbol,action_type,ex_date,raw_name" });
      if (error) console.error("corporate_actions upsert failed", error);
    }
  }

  const fromCache = (cached ?? []).filter((r) => freshSymbols.has(r.symbol)).map(toRow);
  const fromRefetch = refetched.flatMap((r) => r.rows);

  return Response.json({ ok: true, events: [...fromCache, ...fromRefetch] });
}

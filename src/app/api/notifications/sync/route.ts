import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { ActionType } from "@/lib/types";

const LOOKBACK_DAYS = 30;

function dedupKey(symbol: string, actionType: string, exDate: string | null): string {
  return `ca:${symbol}|${actionType}|${exDate ?? "no-date"}`;
}

function formatTitle(symbol: string, actionType: ActionType, subType: string | null, amount: number | null): string {
  switch (actionType) {
    case "Dividend":
      return amount != null
        ? `${symbol}: Dividend ₹${amount}`
        : `${symbol}: Dividend`;
    case "Bonus":
      return subType ? `${symbol}: Bonus ${subType}` : `${symbol}: Bonus Issue`;
    case "Split":
      return subType ? `${symbol}: Stock Split ${subType}` : `${symbol}: Stock Split`;
    case "Rights":
      return subType ? `${symbol}: Rights Issue ${subType}` : `${symbol}: Rights Issue`;
    case "Buyback":
      return `${symbol}: Buyback`;
    case "Merger":
      return `${symbol}: Merger / Demerger`;
    case "Delisting":
      return `${symbol}: Delisting`;
    default:
      return `${symbol}: Corporate Action`;
  }
}

function formatBody(
  actionType: ActionType,
  exDate: string | null,
  subType: string | null,
  source: "portfolio" | "watchlist"
): string {
  const parts: string[] = [];
  if (exDate) parts.push(`Ex-date ${formatDate(exDate)}`);
  if (subType && actionType === "Dividend") parts.push(subType);
  parts.push(`In your ${source}`);
  return parts.join(" · ");
}

function category(
  actionType: ActionType,
  source: "portfolio" | "watchlist"
): "dividend" | "portfolio" | "watchlist" {
  if (actionType === "Dividend") return "dividend";
  return source;
}

export async function POST() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  // Get all symbols from portfolio and watchlist in parallel
  const [{ data: holdingRows }, { data: watchlistRows }] = await Promise.all([
    supabase.from("portfolio_holdings").select("symbol").eq("user_id", userId),
    supabase.from("watchlist").select("symbol").eq("user_id", userId),
  ]);

  const portfolioSymbols = new Set((holdingRows ?? []).map((r) => r.symbol));
  const watchlistSymbols = new Set((watchlistRows ?? []).map((r) => r.symbol));
  const allSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];

  if (allSymbols.length === 0) return NextResponse.json({ ok: true, created: 0 });

  // Fetch cached corporate actions for those symbols from Supabase
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);
  const lookbackStr = lookbackDate.toISOString().slice(0, 10);

  const { data: actions } = await supabase
    .from("corporate_actions")
    .select("symbol, action_type, sub_type, ex_date, amount")
    .in("symbol", allSymbols)
    .gte("ex_date", lookbackStr);

  if (!actions || actions.length === 0) return NextResponse.json({ ok: true, created: 0 });

  // Get existing dedup keys for this user to avoid duplicates
  const { data: existingNotifs } = await supabase
    .from("notifications")
    .select("dedup_key")
    .eq("user_id", userId)
    .not("dedup_key", "is", null);

  const existingKeys = new Set((existingNotifs ?? []).map((n) => n.dedup_key as string));

  // Build notifications to insert
  const toInsert = actions
    .filter((a) => {
      const key = dedupKey(a.symbol, a.action_type, a.ex_date);
      return !existingKeys.has(key);
    })
    .map((a) => {
      const actionType = a.action_type as ActionType;
      const source: "portfolio" | "watchlist" = portfolioSymbols.has(a.symbol) ? "portfolio" : "watchlist";
      return {
        user_id: userId,
        category: category(actionType, source),
        title: formatTitle(a.symbol, actionType, a.sub_type, a.amount),
        body: formatBody(actionType, a.ex_date, a.sub_type, source),
        dedup_key: dedupKey(a.symbol, a.action_type, a.ex_date),
      };
    });

  if (toInsert.length === 0) return NextResponse.json({ ok: true, created: 0 });

  const { error } = await supabase
    .from("notifications")
    .upsert(toInsert, { onConflict: "user_id,dedup_key", ignoreDuplicates: true });

  if (error) {
    console.error("notifications sync failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: toInsert.length });
}

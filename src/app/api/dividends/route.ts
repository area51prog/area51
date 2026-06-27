import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxFundamentals } from "@/lib/providers/upstox";
import { DividendEvent } from "@/lib/types";

// Corporate actions are announced weeks ahead of their ex-date and don't change
// once filed, so a day-long cache avoids re-hitting 5 Upstox endpoints per symbol
// on every page load.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function dividendType(name: string): DividendEvent["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("interim")) return "Interim";
  if (lower.includes("special")) return "Special";
  return "Final";
}

async function fetchDividendsForSymbol(
  supabase: Awaited<ReturnType<typeof createClient>>,
  symbol: string
): Promise<DividendEvent[]> {
  const fundamentals = await getUpstoxFundamentals(supabase, symbol);
  if (!fundamentals) return [];
  return fundamentals.corporateActions
    .filter((a) => a.name.toLowerCase().includes("dividend") && a.exDate && a.amount)
    .map<DividendEvent>((a) => ({
      symbol,
      exDate: a.exDate as string,
      // Upstox corporate actions only expose the ex-date, not a separate
      // payment date — use it for both until that data becomes available.
      paymentDate: a.exDate as string,
      amountPerShare: a.amount as number,
      type: dividendType(a.name),
    }));
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
    .from("dividend_cache")
    .select("symbol, events, fetched_at")
    .in("symbol", symbols);

  const fresh = new Map((cached ?? []).filter((c) => Date.now() - new Date(c.fetched_at).getTime() < CACHE_TTL_MS).map((c) => [c.symbol, c.events as unknown as DividendEvent[]]));

  const staleSymbols = symbols.filter((s) => !fresh.has(s));

  const refetched = await Promise.all(
    staleSymbols.map(async (symbol) => ({ symbol, events: await fetchDividendsForSymbol(supabase, symbol) }))
  );

  if (refetched.length > 0) {
    await supabase.from("dividend_cache").upsert(
      refetched.map(({ symbol, events }) => ({
        symbol,
        events: events as unknown as never,
        fetched_at: new Date().toISOString(),
      }))
    );
  }

  const events = [...fresh.values(), ...refetched.map((r) => r.events)].flat();

  return Response.json({ ok: true, events });
}

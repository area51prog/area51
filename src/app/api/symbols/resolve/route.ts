import { NextRequest } from "next/server";
import { resolveByIsins, lookupInstrument } from "@/lib/providers/instruments";
import { createClient } from "@/lib/supabase/server";

interface ResolveItem {
  symbol: string;
  isin: string | null;
}

// Resolves broker CSV symbols/ISINs to the app's canonical trading symbols.
// ISIN is tried first (reliable across brokers); falls back to a symbol lookup;
// otherwise echoes the broker symbol uppercased with resolved:false so the UI
// can flag it for manual review.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  let items: ResolveItem[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.items)) items = body.items.slice(0, 500);
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  try {
    const isins = items.map((i) => i.isin ?? "").filter(Boolean);
    const byIsin = await resolveByIsins(isins);

    const results = await Promise.all(
      items.map(async (item) => {
        const brokerSymbol = (item.symbol ?? "").trim().toUpperCase();
        const isin = (item.isin ?? "").trim().toUpperCase();

        const isinHit = isin ? byIsin.get(isin) : undefined;
        if (isinHit) {
          return { symbol: brokerSymbol, isin, resolvedSymbol: isinHit.symbol, exchange: isinHit.exchange, resolved: true };
        }

        const bySymbol = brokerSymbol ? await lookupInstrument(brokerSymbol) : null;
        if (bySymbol) {
          return { symbol: brokerSymbol, isin, resolvedSymbol: bySymbol.symbol, exchange: bySymbol.exchange, resolved: true };
        }

        return { symbol: brokerSymbol, isin, resolvedSymbol: brokerSymbol, exchange: null, resolved: false };
      })
    );

    return Response.json({ ok: true, results });
  } catch {
    return Response.json({ ok: false, error: "Resolution failed" }, { status: 502 });
  }
}

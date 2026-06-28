import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxFullQuote, getStaleUpstoxFullQuote } from "@/lib/providers/upstox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const supabase = await createClient();

  const quote = await getUpstoxFullQuote(supabase, symbol);
  if (quote) return Response.json({ ok: true, quote, stale: false });

  const stale = await getStaleUpstoxFullQuote(supabase, symbol);
  if (stale) return Response.json({ ok: true, quote: stale.payload, stale: true, staleAt: stale.fetchedAt });

  return Response.json({ ok: true, quote: null, stale: false });
}

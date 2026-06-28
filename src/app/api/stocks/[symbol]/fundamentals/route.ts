import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxFundamentals, getStaleUpstoxFundamentals } from "@/lib/providers/upstox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const supabase = await createClient();

  const fundamentals = await getUpstoxFundamentals(supabase, symbol);
  if (fundamentals) return Response.json({ ok: true, fundamentals, stale: false });

  const stale = await getStaleUpstoxFundamentals(supabase, symbol);
  if (stale) {
    return Response.json({ ok: true, fundamentals: stale.payload, stale: true, staleAt: stale.fetchedAt });
  }

  return Response.json({ ok: true, fundamentals: null, stale: false });
}

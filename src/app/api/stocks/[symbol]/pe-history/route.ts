import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxFundamentals, getPeHistory } from "@/lib/providers/upstox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const supabase = await createClient();

  const fundamentals = await getUpstoxFundamentals(supabase, symbol);
  const peHistory = fundamentals ? getPeHistory(fundamentals) : null;
  return Response.json({ ok: true, peHistory });
}

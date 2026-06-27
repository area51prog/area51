import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUpstoxFullQuote } from "@/lib/providers/upstox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const supabase = await createClient();

  const quote = await getUpstoxFullQuote(supabase, symbol);
  return Response.json({ ok: true, quote });
}

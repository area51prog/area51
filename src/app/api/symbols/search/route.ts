import { NextRequest } from "next/server";
import { searchInstruments } from "@/lib/providers/instruments";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.slice(0, 40) ?? "";

  if (!q.trim()) {
    return Response.json({ ok: true, results: [] });
  }

  try {
    const results = await searchInstruments(q);
    return Response.json({ ok: true, results });
  } catch {
    return Response.json({ ok: false, results: [] }, { status: 502 });
  }
}

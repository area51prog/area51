import { NextRequest } from "next/server";
import { searchInstruments } from "@/lib/providers/instruments";

export async function GET(req: NextRequest) {
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

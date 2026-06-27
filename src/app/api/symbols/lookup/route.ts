import { NextRequest } from "next/server";
import { lookupInstrument } from "@/lib/providers/instruments";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.slice(0, 40) ?? "";

  if (!symbol.trim()) {
    return Response.json({ ok: true, instrument: null });
  }

  try {
    const instrument = await lookupInstrument(symbol);
    return Response.json({ ok: true, instrument });
  } catch {
    return Response.json({ ok: false, instrument: null }, { status: 502 });
  }
}

import { clearUpstoxToken } from "@/lib/upstoxToken";

export async function POST() {
  clearUpstoxToken();
  return Response.json({ ok: true });
}

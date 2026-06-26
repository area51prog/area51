import { clearUpstoxToken } from "@/lib/upstoxToken";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await clearUpstoxToken(supabase);
  return Response.json({ ok: true });
}

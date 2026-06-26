import { getValidUpstoxAccessToken, readUpstoxToken } from "@/lib/upstoxToken";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const upstoxConfigured = Boolean(process.env.UPSTOX_CLIENT_ID && process.env.UPSTOX_CLIENT_SECRET);
  const token = await readUpstoxToken(supabase);
  const upstoxConnected = Boolean(await getValidUpstoxAccessToken(supabase));
  const finnhubConfigured = Boolean(process.env.FINNHUB_API_KEY);

  return Response.json({
    upstoxConfigured,
    upstoxConnected,
    upstoxExpiresAt: token?.expiresAt ?? null,
    finnhubConfigured,
  });
}

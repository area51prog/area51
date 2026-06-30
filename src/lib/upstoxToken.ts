import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";

const IST_OFFSET_MIN = 330;

interface StoredToken {
  accessToken: string;
  obtainedAt: number;
  expiresAt: number;
}

type Client = SupabaseClient<Database>;

// Upstox access tokens always expire at 3:30 AM IST the day after they were
// issued, regardless of issue time.
function computeExpiry(obtainedAtMs: number) {
  const istMs = obtainedAtMs + IST_OFFSET_MIN * 60_000;
  const ist = new Date(istMs);
  const expiryIstMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1, 3, 30, 0, 0);
  return expiryIstMs - IST_OFFSET_MIN * 60_000;
}

export async function saveUpstoxToken(supabase: Client, accessToken: string): Promise<StoredToken | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const obtainedAt = Date.now();
  const token: StoredToken = { accessToken, obtainedAt, expiresAt: computeExpiry(obtainedAt) };

  await supabase.from("upstox_tokens").upsert({
    user_id: userId,
    access_token: token.accessToken,
    obtained_at: new Date(token.obtainedAt).toISOString(),
    expires_at: new Date(token.expiresAt).toISOString(),
  });

  return token;
}

export async function readUpstoxToken(supabase: Client): Promise<StoredToken | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data } = await supabase
    .from("upstox_tokens")
    .select("access_token, obtained_at, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    accessToken: data.access_token,
    obtainedAt: new Date(data.obtained_at).getTime(),
    expiresAt: new Date(data.expires_at).getTime(),
  };
}

export async function getValidUpstoxAccessToken(supabase: Client): Promise<string | null> {
  const token = await readUpstoxToken(supabase);
  if (!token || Date.now() >= token.expiresAt) return null;
  return token.accessToken;
}

// Returns the user's OAuth token if valid, otherwise falls back to the
// app-level analytics token (long-lived, for market/fundamentals data).
export async function getUpstoxTokenWithFallback(supabase: Client): Promise<string | null> {
  const userToken = await getValidUpstoxAccessToken(supabase);
  if (userToken) return userToken;
  return process.env.UPSTOX_ANALYTICS_TOKEN ?? null;
}

export async function clearUpstoxToken(supabase: Client): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  await supabase.from("upstox_tokens").delete().eq("user_id", userId);
}

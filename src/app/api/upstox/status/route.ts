import { getValidUpstoxAccessToken, readUpstoxToken } from "@/lib/upstoxToken";

export async function GET() {
  const upstoxConfigured = Boolean(process.env.UPSTOX_CLIENT_ID && process.env.UPSTOX_CLIENT_SECRET);
  const token = readUpstoxToken();
  const upstoxConnected = Boolean(getValidUpstoxAccessToken());
  const finnhubConfigured = Boolean(process.env.FINNHUB_API_KEY);

  return Response.json({
    upstoxConfigured,
    upstoxConnected,
    upstoxExpiresAt: token?.expiresAt ?? null,
    finnhubConfigured,
  });
}

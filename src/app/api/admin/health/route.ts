import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROVIDERS = ["anthropic", "upstox", "finnhub", "resend"] as const;

/** System & data health: token expiry, cache freshness, recent error rates. */
export async function GET() {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const since24 = new Date(Date.now() - DAY_MS).toISOString();

    const [
      { count: tokenTotal },
      { count: tokenExpired },
      { data: cacheNewest },
      { count: cacheTotal },
      { data: caNewest },
      { data: recent, error: recentError },
    ] = await Promise.all([
      admin.from("upstox_tokens").select("user_id", { count: "exact", head: true }),
      admin.from("upstox_tokens").select("user_id", { count: "exact", head: true }).lt("expires_at", nowIso),
      admin.from("market_data_cache").select("fetched_at").order("fetched_at", { ascending: false }).limit(1),
      admin.from("market_data_cache").select("cache_key", { count: "exact", head: true }),
      admin.from("corporate_actions").select("fetched_at").order("fetched_at", { ascending: false }).limit(1),
      admin.from("api_usage_log").select("provider, status").gte("created_at", since24),
    ]);

    if (recentError) {
      return Response.json({ ok: false, error: recentError.message }, { status: 500 });
    }

    const errorRates = PROVIDERS.map((provider) => {
      const pr = (recent ?? []).filter((r) => r.provider === provider);
      const errors = pr.filter((r) => r.status === "error").length;
      return {
        provider,
        calls: pr.length,
        errors,
        errorRate: pr.length ? Number(((errors / pr.length) * 100).toFixed(1)) : 0,
      };
    });

    return Response.json({
      ok: true,
      health: {
        tokens: { total: tokenTotal ?? 0, expired: tokenExpired ?? 0 },
        marketDataCache: { entries: cacheTotal ?? 0, newestFetchedAt: cacheNewest?.[0]?.fetched_at ?? null },
        corporateActions: { newestFetchedAt: caNewest?.[0]?.fetched_at ?? null },
        errorRates,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load health" }, { status: 500 });
  }
}

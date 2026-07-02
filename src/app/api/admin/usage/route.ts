import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROVIDERS = ["anthropic", "upstox", "finnhub", "resend"] as const;

/** API usage & cost analytics from api_usage_log. Query: ?provider=&days= */
export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const providerFilter = req.nextUrl.searchParams.get("provider");
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || 30, 1), 365);

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * DAY_MS).toISOString();
    const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";

    let windowQuery = admin
      .from("api_usage_log")
      .select("provider, status, cost_usd, input_tokens, output_tokens, latency_ms, created_at, user_id, endpoint")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (providerFilter && PROVIDERS.includes(providerFilter as (typeof PROVIDERS)[number])) {
      windowQuery = windowQuery.eq("provider", providerFilter);
    }

    const [{ data: rows, error: rowsError }, { data: anthropicAll, error: allError }, { data: reports, error: reportsError }] =
      await Promise.all([
        windowQuery.limit(5000),
        admin.from("api_usage_log").select("cost_usd, input_tokens, output_tokens").eq("provider", "anthropic"),
        admin.from("research_reports").select("generated_by"),
      ]);

    if (rowsError || allError || reportsError) {
      return Response.json({ ok: false, error: rowsError?.message ?? allError?.message ?? reportsError?.message }, { status: 500 });
    }

    const windowRows = rows ?? [];

    // Per-provider totals within the window.
    const byProvider = PROVIDERS.map((provider) => {
      const pr = windowRows.filter((r) => r.provider === provider);
      return {
        provider,
        count: pr.length,
        errors: pr.filter((r) => r.status === "error").length,
      };
    }).filter((p) => providerFilter ? p.provider === providerFilter : true);

    // Daily time series: one entry per day with a count per provider.
    const dayMap = new Map<string, Record<string, number>>();
    for (const r of windowRows) {
      const day = r.created_at.slice(0, 10);
      const bucket = dayMap.get(day) ?? {};
      bucket[r.provider] = (bucket[r.provider] ?? 0) + 1;
      dayMap.set(day, bucket);
    }
    const timeSeries = [...dayMap.entries()]
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Anthropic cost/token roll-ups.
    const sumCost = (list: { cost_usd: number | null }[]) => list.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
    const anthropicWindow = windowRows.filter((r) => r.provider === "anthropic");
    const anthropicToday = anthropicWindow.filter((r) => r.created_at >= todayStart);
    const cost = {
      today: Number(sumCost(anthropicToday).toFixed(4)),
      window: Number(sumCost(anthropicWindow).toFixed(4)),
      allTime: Number(sumCost(anthropicAll ?? []).toFixed(4)),
      inputTokens: (anthropicAll ?? []).reduce((s, r) => s + (r.input_tokens ?? 0), 0),
      outputTokens: (anthropicAll ?? []).reduce((s, r) => s + (r.output_tokens ?? 0), 0),
      totalCalls: (anthropicAll ?? []).length,
    };

    // Top users by research reports generated (resolve emails via auth).
    const reportCounts = new Map<string, number>();
    for (const r of reports ?? []) {
      if (!r.generated_by) continue;
      reportCounts.set(r.generated_by, (reportCounts.get(r.generated_by) ?? 0) + 1);
    }
    const topUserIds = [...reportCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const topUsers = topUserIds.map(([id, count]) => ({ id, email: emailById.get(id) ?? "(deleted)", reports: count }));

    // Recent errors across providers within the window.
    const recentErrors = windowRows
      .filter((r) => r.status === "error")
      .slice(0, 20)
      .map((r) => ({ provider: r.provider, endpoint: r.endpoint, created_at: r.created_at, latency_ms: r.latency_ms }));

    return Response.json({
      ok: true,
      usage: { days, byProvider, timeSeries, cost, topUsers, recentErrors, totalCalls: windowRows.length },
    });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load usage" }, { status: 500 });
  }
}

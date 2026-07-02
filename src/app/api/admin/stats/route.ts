import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Overview KPIs for the admin dashboard, computed from existing tables. */
export async function GET() {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  try {
    const admin = createAdminClient();
    const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();

    const [
      { data: profiles, error: profilesError },
      { count: portfolioCount },
      { count: holdingCount },
      { count: reportCount },
      { count: reportCount30 },
      { data: holdings, error: holdingsError },
    ] = await Promise.all([
      admin.from("profiles").select("tier, role, status, created_at"),
      admin.from("portfolios").select("id", { count: "exact", head: true }),
      admin.from("portfolio_holdings").select("id", { count: "exact", head: true }),
      admin.from("research_reports").select("symbol", { count: "exact", head: true }),
      admin.from("research_reports").select("symbol", { count: "exact", head: true }).gte("generated_at", since30),
      admin.from("portfolio_holdings").select("symbol"),
    ]);

    if (profilesError || holdingsError) {
      return Response.json({ ok: false, error: profilesError?.message ?? holdingsError?.message }, { status: 500 });
    }

    const rows = profiles ?? [];
    const totalUsers = rows.length;
    const premiumUsers = rows.filter((p) => p.tier === "premium").length;
    const suspendedUsers = rows.filter((p) => p.status === "suspended").length;
    const adminUsers = rows.filter((p) => p.role === "administrator").length;

    // Signups per day for the last 30 days (only days with at least one signup).
    const signupBuckets = new Map<string, number>();
    for (const p of rows) {
      if (!p.created_at || p.created_at < since30) continue;
      const day = p.created_at.slice(0, 10);
      signupBuckets.set(day, (signupBuckets.get(day) ?? 0) + 1);
    }
    const signups = [...signupBuckets.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top held symbols by number of holding rows.
    const symbolCounts = new Map<string, number>();
    for (const h of holdings ?? []) {
      symbolCounts.set(h.symbol, (symbolCounts.get(h.symbol) ?? 0) + 1);
    }
    const topSymbols = [...symbolCounts.entries()]
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return Response.json({
      ok: true,
      stats: {
        totalUsers,
        premiumUsers,
        freeUsers: totalUsers - premiumUsers,
        suspendedUsers,
        adminUsers,
        portfolios: portfolioCount ?? 0,
        holdings: holdingCount ?? 0,
        reports: reportCount ?? 0,
        reports30d: reportCount30 ?? 0,
        signups,
        topSymbols,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load stats" }, { status: 500 });
  }
}

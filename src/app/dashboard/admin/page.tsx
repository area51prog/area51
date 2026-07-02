"use client";

import { Card, PriceAreaChart } from "@/components/ui";
import { useAdminData, AdminStats } from "@/lib/useAdminData";

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-heading">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-foreground/50">{sub}</div>}
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { data: stats, error, loading } = useAdminData<AdminStats>("/api/admin/stats", "stats");

  if (loading) return <p className="text-sm text-foreground/50">Loading overview…</p>;
  if (error) return <div className="rounded-lg border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">{error}</div>;
  if (!stats) return null;

  const signupSeries = stats.signups.map((s) => ({ date: s.date.slice(5), value: s.count }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total users" value={String(stats.totalUsers)} sub={`${stats.adminUsers} admin`} />
        <KpiCard label="Premium" value={String(stats.premiumUsers)} sub={`${stats.freeUsers} free`} />
        <KpiCard label="Suspended" value={String(stats.suspendedUsers)} />
        <KpiCard label="Portfolios" value={String(stats.portfolios)} sub={`${stats.holdings} holdings`} />
        <KpiCard label="Research reports" value={String(stats.reports)} sub={`${stats.reports30d} in 30d`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Signups (last 30 days)" className="lg:col-span-2">
          {signupSeries.length > 1 ? (
            <PriceAreaChart
              data={signupSeries}
              height={240}
              valueLabel="Signups"
              valueFormat={(v) => `${v}`}
              yAxisFormatter={(v) => `${v}`}
            />
          ) : (
            <p className="py-10 text-center text-sm text-foreground/50">Not enough signup activity to chart yet.</p>
          )}
        </Card>

        <Card title="Most-held symbols">
          {stats.topSymbols.length === 0 ? (
            <p className="text-sm text-foreground/50">No holdings yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topSymbols.map((s, i) => (
                <li key={s.symbol} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-right text-xs text-foreground/40">{i + 1}</span>
                    <span className="font-medium text-heading">{s.symbol}</span>
                  </span>
                  <span className="text-foreground/60">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

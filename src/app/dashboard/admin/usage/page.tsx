"use client";

import { useState } from "react";
import { Card, PriceAreaChart, RangeSelector } from "@/components/ui";
import { useAdminData, AdminUsage } from "@/lib/useAdminData";
import { Badge } from "../_components/Badge";

const RANGES = ["7", "30", "90"] as const;

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-heading">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-foreground/50">{sub}</div>}
    </Card>
  );
}

export default function AdminUsagePage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>("30");
  const { data: usage, error, loading } = useAdminData<AdminUsage>(`/api/admin/usage?days=${days}`, "usage");

  const PROVIDER_COLORS: Record<string, string> = {
    anthropic: "#6d6af5",
    upstox: "#15803d",
    finnhub: "#0891b2",
    resend: "#d97706",
  };

  const series =
    usage?.timeSeries.map((row) => {
      const { date, ...rest } = row;
      const total = Object.values(rest).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);
      return { date: String(date).slice(5), value: total };
    }) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/50">External API calls & Anthropic cost</p>
        <RangeSelector ranges={[...RANGES]} value={days} onChange={setDays} />
      </div>

      {error && <div className="rounded-lg border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">{error}</div>}
      {loading && <p className="text-sm text-foreground/50">Loading usage…</p>}

      {usage && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Claude cost (today)" value={`$${usage.cost.today.toFixed(4)}`} />
            <KpiCard label={`Claude cost (${days}d)`} value={`$${usage.cost.window.toFixed(4)}`} />
            <KpiCard label="Claude cost (all-time)" value={`$${usage.cost.allTime.toFixed(4)}`} sub={`${usage.cost.totalCalls} calls`} />
            <KpiCard
              label="Tokens (all-time)"
              value={`${(usage.cost.inputTokens / 1000).toFixed(1)}k in`}
              sub={`${(usage.cost.outputTokens / 1000).toFixed(1)}k out`}
            />
          </div>

          <Card title={`API calls per day (last ${days} days)`}>
            {series.length > 1 ? (
              <PriceAreaChart data={series} height={220} valueLabel="Calls" valueFormat={(v) => `${v}`} yAxisFormatter={(v) => `${v}`} />
            ) : (
              <p className="py-8 text-center text-sm text-foreground/50">Not enough data to chart yet.</p>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="By provider">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold text-foreground/50">
                    <th className="py-2">Provider</th>
                    <th className="py-2">Calls</th>
                    <th className="py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byProvider.map((p) => (
                    <tr key={p.provider} className="border-b border-line last:border-0">
                      <td className="py-2 capitalize">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: PROVIDER_COLORS[p.provider] ?? "#888" }} />
                          {p.provider}
                        </span>
                      </td>
                      <td className="py-2">{p.count}</td>
                      <td className="py-2">{p.errors > 0 ? <Badge tone="down">{p.errors}</Badge> : <span className="text-foreground/40">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Top users by reports">
              {usage.topUsers.length === 0 ? (
                <p className="text-sm text-foreground/50">No research reports generated yet.</p>
              ) : (
                <ul className="space-y-2">
                  {usage.topUsers.map((u) => (
                    <li key={u.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-foreground">{u.email}</span>
                      <span className="ml-3 flex-none font-semibold text-heading">{u.reports}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Recent errors">
            {usage.recentErrors.length === 0 ? (
              <p className="text-sm text-foreground/50">No errors in this window. 🎉</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {usage.recentErrors.map((e, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>
                      <Badge tone="down">{e.provider}</Badge> <span className="ml-2 text-foreground/70">{e.endpoint}</span>
                    </span>
                    <span className="text-xs text-foreground/40">{new Date(e.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

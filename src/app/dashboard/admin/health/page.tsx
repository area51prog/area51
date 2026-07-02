"use client";

import { Card } from "@/components/ui";
import { useAdminData, AdminHealth } from "@/lib/useAdminData";
import { Badge } from "../_components/Badge";

function ageLabel(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AdminHealthPage() {
  const { data: health, error, loading } = useAdminData<AdminHealth>("/api/admin/health", "health");

  if (loading) return <p className="text-sm text-foreground/50">Loading health…</p>;
  if (error) return <div className="rounded-lg border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">{error}</div>;
  if (!health) return null;

  const tokenTone = health.tokens.expired > 0 ? "down" : "up";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Upstox tokens">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-heading">{health.tokens.expired}</span>
            <span className="text-sm text-foreground/50">expired of {health.tokens.total}</span>
          </div>
          <div className="mt-2">
            <Badge tone={tokenTone}>{health.tokens.expired > 0 ? "Action needed" : "All valid"}</Badge>
          </div>
        </Card>

        <Card title="Market data cache">
          <div className="text-3xl font-bold text-heading">{health.marketDataCache.entries}</div>
          <div className="mt-1 text-sm text-foreground/50">
            entries · newest {ageLabel(health.marketDataCache.newestFetchedAt)}
          </div>
        </Card>

        <Card title="Corporate actions">
          <div className="text-sm text-foreground/50">
            Last refreshed <span className="font-semibold text-heading">{ageLabel(health.corporateActions.newestFetchedAt)}</span>
          </div>
        </Card>
      </div>

      <Card title="API error rate (last 24h)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-foreground/50">
              <th className="py-2">Provider</th>
              <th className="py-2">Calls</th>
              <th className="py-2">Errors</th>
              <th className="py-2">Error rate</th>
            </tr>
          </thead>
          <tbody>
            {health.errorRates.map((r) => (
              <tr key={r.provider} className="border-b border-line last:border-0">
                <td className="py-2 capitalize">{r.provider}</td>
                <td className="py-2">{r.calls}</td>
                <td className="py-2">{r.errors}</td>
                <td className="py-2">
                  {r.calls === 0 ? (
                    <span className="text-foreground/40">—</span>
                  ) : (
                    <Badge tone={r.errorRate > 10 ? "down" : r.errorRate > 0 ? "amber" : "up"}>{r.errorRate}%</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

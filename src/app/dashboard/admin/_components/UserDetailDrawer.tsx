"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "./Badge";
import type { AdminUserDetail } from "./types";

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function UserDetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset + fetch when the selected user changes
    setDetail(null);
    setError("");
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok) setDetail(json.detail);
        else setError(json.error ?? "Failed to load user");
      })
      .catch(() => !cancelled && setError("Failed to load user"));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-heading">User details</h3>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {error && <div className="rounded-lg border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">{error}</div>}
        {!detail && !error && <p className="text-sm text-foreground/50">Loading…</p>}

        {detail && (
          <div className="space-y-5">
            <div>
              <div className="text-lg font-semibold text-heading">{detail.full_name || "—"}</div>
              <div className="text-sm text-foreground/60">{detail.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={detail.role === "administrator" ? "brand" : "neutral"}>
                  {detail.role === "administrator" ? "Admin" : "User"}
                </Badge>
                <Badge tone={detail.tier === "premium" ? "amber" : "neutral"}>{detail.tier}</Badge>
                <Badge tone={detail.status === "active" ? "up" : "down"}>{detail.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Portfolios", detail.counts.portfolios],
                  ["Watchlists", detail.counts.watchlists],
                  ["Holdings", detail.counts.holdings],
                  ["Reports", detail.counts.reports],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-background/40 px-3 py-2.5">
                  <div className="text-xs uppercase tracking-wide text-foreground/50">{label}</div>
                  <div className="mt-0.5 text-lg font-bold text-heading">{value}</div>
                </div>
              ))}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-foreground/50">Joined</dt>
                <dd className="text-foreground">{fmtDate(detail.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Last sign-in</dt>
                <dd className="text-foreground">{fmtDate(detail.last_sign_in_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Last API activity</dt>
                <dd className="text-foreground">{fmtDate(detail.lastApiActivity)}</dd>
              </div>
            </dl>
          </div>
        )}
      </aside>
    </div>
  );
}

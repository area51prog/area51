"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { Badge } from "../_components/Badge";
import type { AdminAuditEntry } from "@/lib/useAdminData";

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AdminAuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const pageSize = 50;
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/admin/audit?page=${page}`);
      const json = await res.json();
      if (!json.ok) return setError(json.error ?? "Failed to load audit log");
      setEntries(json.entries);
      setTotal(json.total ?? 0);
    } catch {
      setError("Failed to load audit log.");
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on page change
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">{error}</div>}
      <Card>
        {!entries ? (
          <p className="text-sm text-foreground/50">Loading audit log…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-foreground/50">No admin actions recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-foreground/50">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Actor</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line align-top last:border-0">
                  <td className="py-2.5 pr-3 text-xs text-foreground/50">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-foreground">{e.actor_email ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <Badge tone={e.action.includes("delete") ? "down" : "brand"}>{e.action}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-foreground/60">
                    {e.target_type}
                    {e.target_id ? `:${e.target_id.slice(0, 8)}…` : ""}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-foreground/50">
                    {e.detail ? (
                      <code className="break-all">{JSON.stringify(e.detail)}</code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > pageSize && (
          <div className="mt-4 flex items-center justify-between text-sm text-foreground/60">
            <span>
              {total} events · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-line px-3 py-1 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-line px-3 py-1 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

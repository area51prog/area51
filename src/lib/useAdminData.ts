"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Generic fetch hook for admin API routes. These routes are guarded by
 * requireAdmin() server-side, so the client just fetches JSON of shape
 * { ok: boolean, error?: string, ...payload }.
 */
export function useAdminData<T>(url: string, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load");
        setData(null);
      } else {
        setData(json[key] as T);
      }
    } catch {
      setError("Failed to load — the server returned an unexpected response.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the initial/dependency-driven fetch
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}

// ---- Response payload types ----

export type AdminStats = {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  portfolios: number;
  holdings: number;
  reports: number;
  reports30d: number;
  signups: { date: string; count: number }[];
  topSymbols: { symbol: string; count: number }[];
};

export type AdminUsage = {
  days: number;
  byProvider: { provider: string; count: number; errors: number }[];
  timeSeries: Record<string, number | string>[];
  cost: {
    today: number;
    window: number;
    allTime: number;
    inputTokens: number;
    outputTokens: number;
    totalCalls: number;
  };
  topUsers: { id: string; email: string; reports: number }[];
  recentErrors: { provider: string; endpoint: string; created_at: string; latency_ms: number | null }[];
  totalCalls: number;
};

export type AdminHealth = {
  tokens: { total: number; expired: number };
  marketDataCache: { entries: number; newestFetchedAt: string | null };
  corporateActions: { newestFetchedAt: string | null };
  errorRates: { provider: string; calls: number; errors: number; errorRate: number }[];
};

export type AdminAuditEntry = {
  id: number;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

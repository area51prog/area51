"use client";

import { useCallback, useEffect, useState } from "react";
import { getResearch } from "./mock-data";
import { ResearchReport } from "./types";
import { createClient } from "./supabase/client";

export function useResearch(symbol: string) {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/research?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.ok && data.report) {
          setReport(data.report);
          setGeneratedAt(data.generatedAt);
          setStale(data.stale);
        } else {
          const seeded = getResearch(symbol);
          if (seeded) {
            setReport(seeded);
            setGeneratedAt(seeded.generatedOn);
            setStale(false);
          }
        }
      } catch {
        if (cancelled) return;
        const seeded = getResearch(symbol);
        if (seeded) {
          setReport(seeded);
          setGeneratedAt(seeded.generatedOn);
          setStale(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const generate = useCallback(
    async (force = false) => {
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, force }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to generate research report");
        }

        setReport(data.report);
        setGeneratedAt(data.generatedAt);
        setStale(data.stale);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate research report");
      } finally {
        setGenerating(false);
      }
    },
    [symbol]
  );

  return { report, generatedAt, stale, generating, ready, error, generate };
}

export function useAllGeneratedReports() {
  const [reports, setReports] = useState<Record<string, ResearchReport>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("research_reports")
      .select("symbol, report")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, ResearchReport> = {};
        for (const row of data) map[row.symbol] = row.report as unknown as ResearchReport;
        setReports(map);
      });
  }, []);

  return reports;
}

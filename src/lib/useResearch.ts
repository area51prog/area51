"use client";

import { useEffect, useState } from "react";
import { generateMockReport, getResearch } from "./mock-data";
import { ResearchReport } from "./types";

const KEY = "area51_research_reports";

function load(): Record<string, ResearchReport> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function useResearch(symbol: string) {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrating from seed/localStorage on mount */
    const seeded = getResearch(symbol);
    if (seeded) {
      setReport(seeded);
    } else {
      const stored = load()[symbol];
      if (stored) setReport(stored);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [symbol]);

  function generate() {
    setGenerating(true);
    setTimeout(() => {
      const r = generateMockReport(symbol);
      const all = load();
      all[symbol] = r;
      localStorage.setItem(KEY, JSON.stringify(all));
      setReport(r);
      setGenerating(false);
    }, 1400);
  }

  return { report, generating, ready, generate };
}

export function useAllGeneratedReports() {
  const [reports, setReports] = useState<Record<string, ResearchReport>>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage on mount
    setReports(load());
  }, []);
  return reports;
}

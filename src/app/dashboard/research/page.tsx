"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileSearch } from "lucide-react";
import { RESEARCH_REPORTS, getStock } from "@/lib/mock-data";
import { useAllGeneratedReports } from "@/lib/useResearch";
import { Exchange, ResearchReport } from "@/lib/types";
import { Card, RatingPill } from "@/components/ui";

interface SymbolResult {
  symbol: string;
  name: string;
  exchange: Exchange;
}

export default function ResearchListPage() {
  const generated = useAllGeneratedReports();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SymbolResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when the query is emptied
      setCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = await res.json();
        setCandidates(body.ok ? body.results : []);
      } catch {
        // Aborted or network error — leave the previous results in place.
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const allReports = new Map<string, ResearchReport>();
  for (const r of RESEARCH_REPORTS) allReports.set(r.symbol, r);
  for (const [symbol, r] of Object.entries(generated)) allReports.set(symbol, r);

  const sorted = [...allReports.values()].sort((a, b) => b.generatedOn.localeCompare(a.generatedOn));
  const recent = sorted.slice(0, 3);

  function displayName(symbol: string) {
    return getStock(symbol)?.name ?? symbol;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-4">
          <span className="h-11 w-11 flex-none rounded-xl bg-brand-light text-brand flex items-center justify-center">
            <FileSearch size={20} />
          </span>
          <div>
            <h3 className="font-semibold text-heading">AI Equity Research</h3>
            <p className="text-sm text-foreground/60">
              Generate a rating, 12-month target price, bull/base/bear scenarios and risk summary for any stock — then download it as a PDF.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Research a stock</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any NSE/BSE stock…"
          className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        {candidates.length > 0 && (
          <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-line mt-3">
            {candidates.map((s) => (
              <Link
                key={s.symbol}
                href={`/dashboard/research/${s.symbol}`}
                className="flex items-center justify-between py-2.5 hover:bg-background/60 rounded-lg px-2 -mx-2"
              >
                <span>
                  <span className="font-semibold text-heading text-sm">{s.symbol}</span>{" "}
                  <span className="text-foreground/50 text-sm">{s.name}</span>
                </span>
                <span className="text-xs text-foreground/40">{s.exchange}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Your reports</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((r) => (
              <Link key={r.symbol} href={`/dashboard/research/${r.symbol}`}>
                <Card className="hover:border-brand transition-colors h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-heading">{r.symbol}</span>
                    <RatingPill rating={r.rating} />
                  </div>
                  <p className="text-xs text-foreground/50 mb-3">{displayName(r.symbol)}</p>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-foreground/60">Target</span>
                    <span className="font-bold text-heading">₹{r.targetPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-xs text-foreground/40 mt-2">Generated {r.generatedOn}</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">
            Previously researched stocks
          </h3>
          <Card>
            <div className="divide-y divide-line">
              {sorted.map((r) => (
                <Link
                  key={r.symbol}
                  href={`/dashboard/research/${r.symbol}`}
                  className="flex items-center justify-between py-3 hover:bg-background/60 rounded-lg px-2 -mx-2"
                >
                  <span>
                    <span className="font-semibold text-heading text-sm">{r.symbol}</span>{" "}
                    <span className="text-foreground/50 text-sm">{displayName(r.symbol)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <RatingPill rating={r.rating} />
                    <span className="text-xs text-foreground/40">{r.generatedOn}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

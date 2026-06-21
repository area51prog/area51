"use client";

import Link from "next/link";
import { FileSearch } from "lucide-react";
import { RESEARCH_REPORTS, STOCKS } from "@/lib/mock-data";
import { useAllGeneratedReports } from "@/lib/useResearch";
import { Card, RatingPill } from "@/components/ui";

export default function ResearchListPage() {
  const generated = useAllGeneratedReports();

  const reportedSymbols = new Set([...RESEARCH_REPORTS.map((r) => r.symbol), ...Object.keys(generated)]);
  const reported = STOCKS.filter((s) => reportedSymbols.has(s.symbol));
  const notReported = STOCKS.filter((s) => !reportedSymbols.has(s.symbol));

  function reportFor(symbol: string) {
    return RESEARCH_REPORTS.find((r) => r.symbol === symbol) ?? generated[symbol];
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

      {reported.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Your reports</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reported.map((s) => {
              const r = reportFor(s.symbol)!;
              return (
                <Link key={s.symbol} href={`/dashboard/research/${s.symbol}`}>
                  <Card className="hover:border-brand transition-colors h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-heading">{s.symbol}</span>
                      <RatingPill rating={r.rating} />
                    </div>
                    <p className="text-xs text-foreground/50 mb-3">{s.name}</p>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-foreground/60">Target</span>
                      <span className="font-bold text-heading">₹{r.targetPrice.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="text-xs text-foreground/40 mt-2">Generated {r.generatedOn}</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Generate new research</h3>
        <Card>
          <div className="divide-y divide-line">
            {notReported.map((s) => (
              <Link
                key={s.symbol}
                href={`/dashboard/research/${s.symbol}`}
                className="flex items-center justify-between py-3 hover:bg-background/60 rounded-lg px-2 -mx-2"
              >
                <span>
                  <span className="font-semibold text-heading text-sm">{s.symbol}</span>{" "}
                  <span className="text-foreground/50 text-sm">{s.name}</span>
                </span>
                <span className="text-xs font-semibold text-brand">Generate report →</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

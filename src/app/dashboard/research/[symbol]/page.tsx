"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { Download, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useResearch } from "@/lib/useResearch";
import { useStockSummary, TrendRange } from "@/lib/useStockSummary";
import { getStock } from "@/lib/mock-data";
import { derivePeHistory } from "@/lib/peHistory";
import { Card, ChartMode, ChartModeToggle, PriceAreaChart, RangeSelector, RatingPill } from "@/components/ui";

const TREND_RANGES: TrendRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

export default function ResearchDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol;
  const [range, setRange] = useState<TrendRange>("1Y");
  const [chartMode, setChartMode] = useState<ChartMode>("price");
  const [livePeHistory, setLivePeHistory] = useState<{ date: string; value: number }[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const stock = useStockSummary(symbol, range);
  const { report, generatedAt, stale, generating, ready, error, generate } = useResearch(symbol);

  const mockStock = getStock(symbol);

  useEffect(() => {
    if (mockStock) return;
    let cancelled = false;
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/pe-history`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setLivePeHistory(body.ok ? body.peHistory : null);
      })
      .catch(() => {
        if (!cancelled) setLivePeHistory(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, mockStock]);

  if (stock === null) return notFound();
  if (stock === undefined || !ready) return null;

  if (!report) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand mb-4">
          <Sparkles size={24} />
        </span>
        <h2 className="text-xl font-bold text-heading">No research yet for {stock.symbol}</h2>
        <p className="text-sm text-foreground/60 mt-2 mb-6">
          Generate an AI equity research report — rating, 12-month target, bull/base/bear scenarios, catalysts and risks for {stock.name}.
        </p>
        <button
          onClick={() => generate(false)}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand/90 disabled:opacity-70"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Generating research…
            </>
          ) : error ? (
            <>
              <Sparkles size={16} /> Try again
            </>
          ) : (
            <>
              <Sparkles size={16} /> Generate equity research
            </>
          )}
        </button>
        {error && (
          <p className="text-sm text-down mt-3">{error}</p>
        )}
      </div>
    );
  }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const [{ pdf }, { ResearchReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/ResearchReportPdf"),
      ]);
      const blob = await pdf(<ResearchReportPdf stock={stock!} report={report!} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stock!.symbol}-equity-research-${report!.generatedOn}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5" id="research-report">
      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm print:hidden">
          <span className="text-amber-800">
            This report is more than 30 days old{generatedAt ? ` (generated ${generatedAt.slice(0, 10)})` : ""}.
          </span>
          <button
            onClick={() => generate(true)}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Refreshing…
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Refresh research
              </>
            )}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-down">{error}</p>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-heading">{stock.name}</h2>
            <span className="text-xs font-semibold text-foreground/40 bg-background rounded px-1.5 py-0.5">
              {stock.symbol} · {stock.exchange}
            </span>
          </div>
          <p className="text-sm text-foreground/60">Equity research · Generated {report.generatedOn}</p>
        </div>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold hover:bg-background disabled:opacity-60"
        >
          {downloading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Preparing PDF…
            </>
          ) : (
            <>
              <Download size={15} /> Download PDF
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase">Rating</div>
          <div className="mt-2"><RatingPill rating={report.rating} /></div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase">12M target</div>
          <div className="text-xl font-bold text-heading mt-1">₹{report.targetPrice.toLocaleString("en-IN")}</div>
          <div className={`text-xs font-semibold ${report.upsidePct >= 0 ? "text-up" : "text-down"}`}>
            {report.upsidePct >= 0 ? "+" : ""}{report.upsidePct}% upside
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase">Current price</div>
          <div className="text-xl font-bold text-heading mt-1">₹{report.currentPrice.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase">Market cap</div>
          <div className="text-xl font-bold text-heading mt-1">
            {stock.marketCapCr != null ? `₹${stock.marketCapCr.toLocaleString("en-IN")} cr` : "—"}
          </div>
        </Card>
      </div>

      <Card title="Summary">
        <p className="text-sm text-foreground/70 leading-relaxed">{report.summary}</p>
      </Card>

      <Card
        title="Price trend"
        action={
          <div className="flex items-center gap-2">
            <ChartModeToggle mode={chartMode} onChange={setChartMode} />
            <RangeSelector ranges={TREND_RANGES} value={range} onChange={setRange} />
          </div>
        }
      >
        {chartMode === "pe" ? (
          (() => {
            const peData = mockStock ? derivePeHistory(mockStock) : livePeHistory;
            return peData ? (
              <PriceAreaChart data={peData} valueLabel="P/E" valueFormat={(v) => `${v.toFixed(1)}x`} />
            ) : (
              <p className="text-sm text-foreground/50 py-10 text-center">P/E history unavailable for this stock.</p>
            );
          })()
        ) : (
          <PriceAreaChart data={stock.history.map((h) => ({ date: h.date, value: h.price }))} />
        )}
      </Card>

      <Card title="Scenarios">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {report.scenarios.map((sc) => (
            <div
              key={sc.name}
              className={`rounded-xl border p-4 text-center ${
                sc.name === "Bull" ? "border-up/30" : sc.name === "Bear" ? "border-down/30" : "border-amber-300"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-foreground/50">{sc.name}</div>
              <div className="text-2xl font-bold text-heading mt-1">₹{sc.target.toLocaleString("en-IN")}</div>
              <div className={`text-sm font-semibold ${sc.returnPct >= 0 ? "text-up" : "text-down"}`}>
                {sc.returnPct >= 0 ? "+" : ""}{sc.returnPct}%
              </div>
              <p className="text-xs text-foreground/60 mt-2 text-left">{sc.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Key metrics">
          <dl className="space-y-2.5 text-sm">
            {report.kpis.map((k) => (
              <div key={k.label} className="flex items-center justify-between">
                <dt className="text-foreground/50">{k.label}</dt>
                <dd className="font-semibold text-heading">{k.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="DCF inputs">
          <dl className="space-y-2.5 text-sm">
            {report.dcf.map((d) => (
              <div key={d.label} className="flex items-center justify-between">
                <dt className="text-foreground/50">{d.label}</dt>
                <dd className="font-semibold text-heading">{d.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Catalysts">
          <ul className="space-y-2 text-sm text-foreground/70 list-disc pl-4">
            {report.catalysts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Card>
        <Card title="Risks">
          <ul className="space-y-2 text-sm text-foreground/70 list-disc pl-4">
            {report.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="text-xs text-foreground/40 italic">
        For educational purposes only — not investment advice. AI-generated analysis, not independently audited.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Position } from "@/lib/usePortfolio";
import { getPortfolioHistory, PortfolioRange } from "@/lib/mock-data";
import { computeContribution } from "@/lib/analytics";
import { formatINRCompact } from "@/lib/format";
import { Card, PriceAreaChart, RangeSelector, Stat } from "@/components/ui";

const PORTFOLIO_RANGES: PortfolioRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

interface BenchmarkPoint {
  date: string;
  value: number;
}

export default function PerformanceTab({
  positions,
  priceBySymbol,
  totalValue,
  totalInvested,
}: {
  positions: Position[];
  priceBySymbol: Record<string, number>;
  totalValue: number;
  totalInvested: number;
}) {
  const [range, setRange] = useState<PortfolioRange>("1Y");
  const [benchmark, setBenchmark] = useState<BenchmarkPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/market-snapshot?range=${range}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body.ok) setBenchmark(body.points);
      })
      .catch(() => {
        if (!cancelled) setBenchmark(null);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested ? (totalGain / totalInvested) * 100 : 0;

  const wealthHistory = getPortfolioHistory(totalValue, range);
  const portfolioReturnPct = (() => {
    const first = wealthHistory[0]?.price;
    const last = wealthHistory[wealthHistory.length - 1]?.price;
    return first ? ((last - first) / first) * 100 : 0;
  })();
  const benchmarkReturnPct = (() => {
    if (!benchmark || benchmark.length < 2) return null;
    const first = benchmark[0].value;
    const last = benchmark[benchmark.length - 1].value;
    return first ? ((last - first) / first) * 100 : null;
  })();

  const contribution = computeContribution(positions, priceBySymbol);

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground/50">
        Portfolio value over time is an indicative trend anchored to your current value, not a stored historical
        series — treat returns below as approximate, not audited figures.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Portfolio value" className="lg:col-span-2" action={<RangeSelector ranges={PORTFOLIO_RANGES} value={range} onChange={setRange} />}>
          <div className="text-xl font-bold text-heading mb-2">{formatINRCompact(totalValue)}</div>
          <PriceAreaChart data={wealthHistory.map((h) => ({ date: h.date, value: h.price }))} />
        </Card>
        <Card>
          <div className="grid grid-cols-1 divide-y divide-line h-full">
            <Stat
              label="Total return"
              value={`${totalGain >= 0 ? "+" : ""}${formatINRCompact(totalGain)}`}
              tone={totalGain >= 0 ? "up" : "down"}
              sub={`${totalGainPct.toFixed(2)}%`}
            />
            <Stat
              label={`Portfolio (${range})`}
              value={`${portfolioReturnPct >= 0 ? "+" : ""}${portfolioReturnPct.toFixed(2)}%`}
              tone={portfolioReturnPct >= 0 ? "up" : "down"}
            />
            <Stat
              label={`Nifty 50 (${range})`}
              value={benchmarkReturnPct === null ? "—" : `${benchmarkReturnPct >= 0 ? "+" : ""}${benchmarkReturnPct.toFixed(2)}%`}
              tone={benchmarkReturnPct === null ? undefined : benchmarkReturnPct >= 0 ? "up" : "down"}
            />
          </div>
        </Card>
      </div>

      <Card title="Contribution to total return">
        {contribution.length === 0 ? (
          <p className="text-sm text-foreground/50 py-8 text-center">No holdings to analyze yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contribution} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eceef7" />
                <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ borderRadius: 8, border: "1px solid #e7e9f3", fontSize: 12 }} />
                <Bar dataKey="contributionToTotalReturnPct" radius={[4, 4, 0, 0]}>
                  {contribution.map((c) => (
                    <Cell key={c.symbol} fill={c.contributionToTotalReturnPct >= 0 ? "#15803d" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

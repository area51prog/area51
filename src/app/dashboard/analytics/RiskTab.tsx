"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Position } from "@/lib/usePortfolio";
import { getStock } from "@/lib/mock-data";
import { computeSectorAllocation, computeConcentration, computeVolatilityPerHolding, VolatilityRow } from "@/lib/analytics";
import { formatINRCompact } from "@/lib/format";
import { Card, Stat } from "@/components/ui";

const COLORS = ["#1a2348", "#4f46e5", "#7c83e8", "#a5abf2", "#c8ccf8", "#15803d", "#dc2626", "#f59e0b"];

export default function RiskTab({
  positions,
  priceBySymbol,
}: {
  positions: Position[];
  priceBySymbol: Record<string, number>;
}) {
  const sectorAllocation = computeSectorAllocation(positions, priceBySymbol);
  const concentration = computeConcentration(positions, priceBySymbol);
  const volatility = positions
    .map((p) => computeVolatilityPerHolding(p.symbol, getStock(p.symbol)?.history))
    .filter((v): v is VolatilityRow & { volatilityPct: number } => v.volatilityPct !== null);

  if (positions.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">Add holdings to see risk and diversification analytics.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Sector allocation" className="lg:col-span-1">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sectorAllocation} dataKey="value" nameKey="sector" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {sectorAllocation.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatINRCompact(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-y-1.5 mt-2 text-xs">
            {sectorAllocation.map((d, i) => (
              <div key={d.sector} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-foreground/60">{d.sector}</span>
                <span className="ml-auto font-medium">{d.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line h-full gap-4 sm:gap-0">
            <Stat label="Top holding weight" value={`${concentration.topHoldingPct.toFixed(1)}%`} />
            <Stat label="Top 3 weight" value={`${concentration.top3Pct.toFixed(1)}%`} />
            <Stat
              label="Concentration (HHI)"
              value={concentration.hhi.toFixed(0)}
              sub={concentration.hhi > 2500 ? "Highly concentrated" : concentration.hhi > 1500 ? "Moderately concentrated" : "Well diversified"}
            />
          </div>
        </Card>
      </div>

      <Card title="Volatility per holding">
        {volatility.length === 0 ? (
          <p className="text-sm text-foreground/50 py-8 text-center">
            Not enough price history for any current holding to estimate volatility yet.
          </p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volatility} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#eceef7" />
                  <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="volatilityPct" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {positions.length > volatility.length && (
              <p className="text-xs text-foreground/40 mt-2">
                {positions.length - volatility.length} holding(s) omitted — limited price history available.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

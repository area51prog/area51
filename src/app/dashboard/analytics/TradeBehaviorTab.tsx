"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Transaction } from "@/lib/useTransactions";
import { Lot } from "@/lib/usePortfolio";
import { computeTradeStats, computeHoldingPeriods } from "@/lib/analytics";
import { formatDate, formatINRCompact } from "@/lib/format";
import { Card, Stat } from "@/components/ui";

export default function TradeBehaviorTab({ transactions, lots }: { transactions: Transaction[]; lots: Lot[] }) {
  const stats = computeTradeStats(transactions);
  const holdingPeriods = computeHoldingPeriods(lots, transactions);

  if (stats.totalTrades === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">
          No closed trades yet — sell a holding to see win rate, average gain/loss, and holding-period behavior here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line h-full gap-4 sm:gap-0">
          <Stat label="Closed trades" value={`${stats.totalTrades}`} />
          <Stat label="Win rate" value={stats.winRate !== null ? `${stats.winRate.toFixed(0)}%` : "—"} />
          <Stat label="Avg gain" value={`+${formatINRCompact(stats.avgGain)}`} tone="up" />
          <Stat label="Avg loss" value={`${formatINRCompact(stats.avgLoss)}`} tone="down" />
        </div>
      </Card>

      <Card title="Holding period distribution">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={holdingPeriods} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eceef7" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e7e9f3", fontSize: 12 }} />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Best & worst trades">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                <th className="py-2 font-semibold">Type</th>
                <th className="py-2 font-semibold">Date</th>
                <th className="py-2 font-semibold">Stock</th>
                <th className="py-2 font-semibold text-right">Qty</th>
                <th className="py-2 font-semibold text-right">Price</th>
                <th className="py-2 font-semibold text-right">Realized P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                stats.bestTrade && { label: "Best", t: stats.bestTrade },
                stats.worstTrade && stats.worstTrade !== stats.bestTrade && { label: "Worst", t: stats.worstTrade },
              ]
                .filter((row): row is { label: string; t: Transaction } => Boolean(row))
                .map(({ label, t }) => (
                  <tr key={label}>
                    <td className="py-2.5 font-semibold text-heading">{label}</td>
                    <td className="py-2.5">{formatDate(t.txnDate)}</td>
                    <td className="py-2.5 font-semibold text-heading">{t.symbol}</td>
                    <td className="py-2.5 text-right">{t.quantity}</td>
                    <td className="py-2.5 text-right">₹{t.price.toFixed(2)}</td>
                    <td className={`py-2.5 text-right font-semibold ${(t.realizedPnl ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                      {(t.realizedPnl ?? 0) >= 0 ? "+" : ""}
                      {formatINRCompact(t.realizedPnl ?? 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

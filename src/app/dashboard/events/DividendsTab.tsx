"use client";

import { Fragment, useMemo, useState } from "react";
import { IndianRupee, TrendingUp, CalendarClock, ChevronDown } from "lucide-react";
import { Card, RangeSelector } from "@/components/ui";
import { Position } from "@/lib/usePortfolio";
import { CorporateActionRow } from "@/lib/types";
import { formatDate, formatINR, formatINRCompact } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const TODAY = new Date();
const TRAILING_12MO_START = new Date(TODAY.getFullYear() - 1, TODAY.getMonth(), TODAY.getDate());

const CURRENT_YEAR = TODAY.getFullYear();
const YEAR_FILTERS = [
  "Annual",
  String(CURRENT_YEAR),
  String(CURRENT_YEAR - 1),
  String(CURRENT_YEAR - 2),
  String(CURRENT_YEAR - 3),
] as const;
type YearFilter = (typeof YEAR_FILTERS)[number];

interface DividendEvent extends CorporateActionRow {
  exDate: string;
  amount: number;
  quantity: number;
  total: number;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function bucketsForFilter(filter: YearFilter): { key: string; label: string }[] {
  if (filter === "Annual") {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - 11 + i, 1);
      return { key: monthKey(d), label: monthLabel(d) };
    });
  }
  const year = Number(filter);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { key: monthKey(d), label: monthLabel(d) };
  });
}

type SortKey = "symbol" | "total12mo" | "yieldOnCost";

export default function DividendsTab({ positions, events }: { positions: Position[]; events: CorporateActionRow[] }) {
  const [yearFilter, setYearFilter] = useState<YearFilter>("Annual");
  const [sortKey, setSortKey] = useState<SortKey>("total12mo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const dividends: DividendEvent[] = useMemo(
    () =>
      events.flatMap((e) => {
        const holding = positions.find((p) => p.symbol === e.symbol);
        if (!holding || e.actionType !== "Dividend" || !e.exDate || e.amount === null) return [];
        return [{ ...e, exDate: e.exDate, amount: e.amount, quantity: holding.quantity, total: e.amount * holding.quantity }];
      }),
    [events, positions]
  );

  const trailing12mo = useMemo(
    () =>
      dividends.filter((d) => {
        const ex = new Date(d.exDate);
        return ex >= TRAILING_12MO_START && ex <= TODAY;
      }),
    [dividends]
  );

  const annualDividendIncome = trailing12mo.reduce((sum, d) => sum + d.total, 0);

  const upcoming = dividends.filter((d) => new Date(d.exDate) >= TODAY).sort((a, b) => a.exDate.localeCompare(b.exDate));
  const upcomingTotal = upcoming.reduce((sum, d) => sum + d.total, 0);

  const chartBuckets = bucketsForFilter(yearFilter);
  const chartData = useMemo(() => {
    const totalsByKey = new Map<string, number>();
    for (const d of dividends) {
      const key = monthKey(new Date(d.exDate));
      totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + d.total);
    }
    return chartBuckets.map((b) => ({ label: b.label, amountRsK: (totalsByKey.get(b.key) ?? 0) / 1000 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chartBuckets is derived from yearFilter, already a dep
  }, [dividends, yearFilter]);

  const perStock = useMemo(() => {
    const bySymbol = new Map<string, { events: DividendEvent[]; total12mo: number }>();
    for (const d of trailing12mo) {
      const entry = bySymbol.get(d.symbol) ?? { events: [], total12mo: 0 };
      entry.events.push(d);
      entry.total12mo += d.total;
      bySymbol.set(d.symbol, entry);
    }
    const rows = Array.from(bySymbol.entries()).map(([symbol, { events: evs, total12mo }]) => {
      const holding = positions.find((p) => p.symbol === symbol);
      const perShareTotal12mo = evs.reduce((sum, e) => sum + e.amount, 0);
      const yieldOnCost = holding && holding.avgPrice > 0 ? (perShareTotal12mo / holding.avgPrice) * 100 : 0;
      return { symbol, events: evs.sort((a, b) => b.exDate.localeCompare(a.exDate)), total12mo, yieldOnCost };
    });
    rows.sort((a, b) => {
      const av = sortKey === "symbol" ? a.symbol : sortKey === "total12mo" ? a.total12mo : a.yieldOnCost;
      const bv = sortKey === "symbol" ? b.symbol : sortKey === "total12mo" ? b.total12mo : b.yieldOnCost;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [trailing12mo, positions, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "symbol", label: "Stock" },
    { key: "total12mo", label: "Total dividend (12mo)", align: "right" },
    { key: "yieldOnCost", label: "Yield on cost", align: "right" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <IndianRupee size={14} /> Annual dividend income
          </div>
          <div className="text-2xl font-bold text-up mt-2">₹{formatINR(annualDividendIncome, 0)}</div>
          <div className="text-xs text-foreground/50 mt-1">Trailing 12 months, across {trailing12mo.length} payouts</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <TrendingUp size={14} /> Projected dividend income
          </div>
          <div className="text-2xl font-bold text-heading mt-2">₹{formatINR(annualDividendIncome, 0)}</div>
          <div className="text-xs text-foreground/50 mt-1">Estimated, based on trailing 12 months</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <CalendarClock size={14} /> Upcoming dividends
          </div>
          {upcoming.length > 0 ? (
            <>
              <div className="text-2xl font-bold text-heading mt-2">₹{formatINR(upcomingTotal, 0)}</div>
              <div className="text-xs text-foreground/50 mt-1">
                {upcoming.length} announced · next {upcoming[0].symbol} on {formatDate(upcoming[0].exDate)}
              </div>
            </>
          ) : (
            <div className="text-sm text-foreground/50 mt-2">None announced</div>
          )}
        </Card>
      </div>

      <Card
        title="Dividends Income"
        action={<RangeSelector ranges={[...YEAR_FILTERS]} value={yearFilter} onChange={setYearFilter} />}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eceef7" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#8b91a8" }}
                axisLine={false}
                tickLine={false}
                label={{ value: "₹ Thousands", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#8b91a8" } }}
              />
              <Tooltip
                formatter={(v) => [`₹${formatINR(Number(v) * 1000, 0)}`, "Received"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e7e9f3", fontSize: 12 }}
              />
              <Bar dataKey="amountRsK" radius={[4, 4, 0, 0]} fill="#15803d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Dividend history</h3>
        <Card>
          {perStock.length === 0 ? (
            <p className="text-sm text-foreground/50 py-4 text-center">No dividends received in the last 12 months.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={`py-2 font-semibold ${col.align === "right" ? "text-right" : ""}`}>
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-foreground/70 ${
                          col.align === "right" ? "flex-row-reverse" : ""
                        }`}
                      >
                        {col.label}
                        {sortKey === col.key && <ChevronDown size={12} className={sortDir === "asc" ? "rotate-180" : ""} />}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {perStock.map((row) => {
                  const isOpen = expanded === row.symbol;
                  return (
                    <Fragment key={row.symbol}>
                      <tr
                        className="cursor-pointer hover:bg-background/60"
                        onClick={() => setExpanded(isOpen ? null : row.symbol)}
                      >
                        <td className="py-2.5 font-semibold text-heading">
                          <span className="inline-flex items-center gap-1.5">
                            <ChevronDown size={14} className={`text-foreground/40 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                            {row.symbol}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-up">+{formatINRCompact(row.total12mo)}</td>
                        <td className="py-2.5 text-right">{row.yieldOnCost.toFixed(2)}%</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={3} className="bg-background/40 py-2 px-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-foreground/40 uppercase tracking-wide">
                                  <th className="py-1.5 font-semibold pl-6">Type</th>
                                  <th className="py-1.5 font-semibold text-right">Ex-date</th>
                                  <th className="py-1.5 font-semibold text-right">Per share</th>
                                  <th className="py-1.5 font-semibold text-right">Received</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line/60">
                                {row.events.map((e, i) => (
                                  <tr key={i}>
                                    <td className="py-1.5 pl-6 text-foreground/60">{e.subType ?? "Final"}</td>
                                    <td className="py-1.5 text-right">{formatDate(e.exDate)}</td>
                                    <td className="py-1.5 text-right">₹{e.amount}</td>
                                    <td className="py-1.5 text-right font-medium text-up">+₹{formatINR(e.total, 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

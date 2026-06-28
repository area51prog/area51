"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronDown, History } from "lucide-react";
import { useTransactions, type Transaction } from "@/lib/useTransactions";
import { usePortfolio } from "@/lib/usePortfolio";
import { formatDate, formatINR, formatINRCompact } from "@/lib/format";
import { Card } from "@/components/ui";

type SideFilter = "all" | "buy" | "sell";

type SortKey = "txnDate" | "portfolioId" | "symbol" | "side" | "quantity" | "price" | "value" | "realizedPnl";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "txnDate", label: "Date" },
  { key: "portfolioId", label: "Portfolio" },
  { key: "symbol", label: "Stock" },
  { key: "side", label: "Side" },
  { key: "quantity", label: "Qty", align: "right" },
  { key: "price", label: "Price", align: "right" },
  { key: "value", label: "Value", align: "right" },
  { key: "realizedPnl", label: "Realized P&L", align: "right" },
];

export default function TransactionsPage() {
  const { transactions, ready } = useTransactions();
  const { lists } = usePortfolio();
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("txnDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const currentMonthKey = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const portfolioName = (id: string) => lists.find((l) => l.id === id)?.name ?? "—";

  const isMonthCollapsed = (month: string) => collapsedMonths[month] ?? month !== currentMonthKey;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleMonth = (month: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [month]: !prev[month] }));
  };

  const sortValue = (t: Transaction, key: SortKey) => {
    switch (key) {
      case "txnDate":
        return new Date(t.txnDate).getTime();
      case "portfolioId":
        return portfolioName(t.portfolioId);
      case "value":
        return t.quantity * t.price;
      case "realizedPnl":
        return t.realizedPnl ?? -Infinity;
      default:
        return t[key];
    }
  };

  const filtered = transactions.filter((t) => {
    if (portfolioFilter !== "all" && t.portfolioId !== portfolioFilter) return false;
    if (sideFilter !== "all" && t.side !== sideFilter) return false;
    return true;
  });

  const totalBought = transactions.filter((t) => t.side === "buy").reduce((sum, t) => sum + t.quantity * t.price, 0);
  const totalSold = transactions.filter((t) => t.side === "sell").reduce((sum, t) => sum + t.quantity * t.price, 0);
  const totalRealizedPnl = transactions.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);

  const byMonth = useMemo(() => {
    const groups = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
      const key = new Date(t.txnDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      acc[key] = acc[key] ?? [];
      acc[key].push(t);
      return acc;
    }, {});

    for (const txns of Object.values(groups)) {
      txns.sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sortValue depends on lists, captured via portfolioName
  }, [filtered, sortKey, sortDir, lists]);

  if (!ready) return null;

  if (transactions.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">
          No transactions yet — buy or sell a stock in your portfolio to see your trade history here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <ArrowUpRight size={14} /> Total bought
          </div>
          <div className="text-2xl font-bold text-heading mt-2">{formatINRCompact(totalBought)}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <ArrowDownRight size={14} /> Total sold
          </div>
          <div className="text-2xl font-bold text-heading mt-2">{formatINRCompact(totalSold)}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <History size={14} /> Total realized P&amp;L
          </div>
          <div className={`text-2xl font-bold mt-2 ${totalRealizedPnl >= 0 ? "text-up" : "text-down"}`}>
            {totalRealizedPnl >= 0 ? "+" : ""}
            {formatINRCompact(totalRealizedPnl)}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={portfolioFilter}
          onChange={(e) => setPortfolioFilter(e.target.value)}
          className="rounded-lg border border-line bg-surface text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="all">All portfolios</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={sideFilter}
          onChange={(e) => setSideFilter(e.target.value as SideFilter)}
          className="rounded-lg border border-line bg-surface text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="all">All sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {Object.keys(byMonth).length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/50 py-10 text-center">No transactions match these filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byMonth).map(([month, txns]) => {
            const collapsed = isMonthCollapsed(month);
            return (
              <Card key={month}>
                <button
                  type="button"
                  onClick={() => toggleMonth(month)}
                  className="flex w-full items-center justify-between text-left mb-3"
                >
                  <h4 className="text-sm font-semibold text-heading">
                    {month} <span className="text-foreground/40 font-normal">({txns.length})</span>
                  </h4>
                  <ChevronDown
                    size={16}
                    className={`text-foreground/50 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!collapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
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
                                {sortKey === col.key && (
                                  <ChevronDown
                                    size={12}
                                    className={sortDir === "asc" ? "rotate-180" : ""}
                                  />
                                )}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {txns.map((t) => (
                          <tr key={t.id}>
                            <td className="py-2.5">{formatDate(t.txnDate)}</td>
                            <td className="py-2.5 text-foreground/60">{portfolioName(t.portfolioId)}</td>
                            <td className="py-2.5 font-semibold text-heading">{t.symbol}</td>
                            <td className="py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-1.5 py-0.5 ${
                                  t.side === "buy" ? "text-up bg-up/10" : "text-down bg-down/10"
                                }`}
                              >
                                {t.side === "buy" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {t.side === "buy" ? "Buy" : "Sell"}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">{t.quantity}</td>
                            <td className="py-2.5 text-right">₹{formatINR(t.price)}</td>
                            <td className="py-2.5 text-right font-medium">{formatINRCompact(t.quantity * t.price)}</td>
                            <td
                              className={`py-2.5 text-right font-semibold ${
                                t.realizedPnl === null ? "text-foreground/40" : t.realizedPnl >= 0 ? "text-up" : "text-down"
                              }`}
                            >
                              {t.realizedPnl === null
                                ? "—"
                                : `${t.realizedPnl >= 0 ? "+" : ""}${formatINRCompact(t.realizedPnl)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

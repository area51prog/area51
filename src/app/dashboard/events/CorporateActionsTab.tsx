"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui";
import { ActionType, CorporateActionRow } from "@/lib/types";
import { formatDate } from "@/lib/format";

const BADGE_STYLES: Record<ActionType, string> = {
  Dividend: "text-up bg-up/10",
  Bonus: "text-brand bg-brand-light",
  Split: "text-brand bg-brand-light",
  Rights: "text-brand bg-brand-light",
  Buyback: "text-up bg-up/10",
  Merger: "text-down bg-down/10",
  Delisting: "text-down bg-down/10",
};

type SortKey = "symbol" | "actionType" | "exDate";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "symbol", label: "Stock" },
  { key: "actionType", label: "Action" },
  { key: "exDate", label: "Ex-date" },
];

export default function CorporateActionsTab({ events }: { events: CorporateActionRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("exDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(
    () => events.filter((e) => e.actionType !== "Dividend" && e.exDate),
    [events]
  );

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortKey === "exDate" ? (a.exDate ?? "") : a[sortKey];
      const bv = sortKey === "exDate" ? (b.exDate ?? "") : b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <Card>
      {sorted.length === 0 ? (
        <p className="text-sm text-foreground/50 py-10 text-center">
          No bonus, split, rights, buyback, merger, or delisting actions for your current holdings.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="py-2 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground/70"
                    >
                      {col.label}
                      {sortKey === col.key && <ChevronDown size={12} className={sortDir === "asc" ? "rotate-180" : ""} />}
                    </button>
                  </th>
                ))}
                <th className="py-2 font-semibold">Details</th>
                <th className="py-2 font-semibold text-right">Ratio / Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((e, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-semibold text-heading">{e.symbol}</td>
                  <td className="py-2.5">
                    <span className={clsx("inline-flex text-xs font-semibold rounded-full px-2 py-0.5", BADGE_STYLES[e.actionType])}>
                      {e.actionType}
                    </span>
                  </td>
                  <td className="py-2.5">{e.exDate ? formatDate(e.exDate) : "—"}</td>
                  <td className="py-2.5 text-foreground/60">{e.details || e.rawName}</td>
                  <td className="py-2.5 text-right">{e.subType ?? (e.amount !== null ? `₹${e.amount}` : "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

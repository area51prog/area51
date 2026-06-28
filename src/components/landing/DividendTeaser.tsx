"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui";
import { STOCKS } from "@/lib/mock-data";
import { CorporateActionRow } from "@/lib/types";

const SYMBOLS = STOCKS.map((s) => s.symbol);
const NAME_BY_SYMBOL = new Map(STOCKS.map((s) => [s.symbol, s.name]));

export default function DividendTeaser() {
  const [events, setEvents] = useState<CorporateActionRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/corporate-actions?symbols=${encodeURIComponent(SYMBOLS.join(","))}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        setEvents(body.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (events ?? [])
    .filter((e) => e.actionType === "Dividend" && e.exDate && e.exDate >= today)
    .sort((a, b) => (a.exDate ?? "").localeCompare(b.exDate ?? ""))
    .slice(0, 6);

  if (events !== null && upcoming.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-16">
      <Card
        title="Upcoming dividends"
        action={<CalendarClock size={16} className="text-foreground/40" />}
      >
        {events === null ? (
          <div className="h-[140px] flex items-center justify-center text-sm text-foreground/40">
            Loading dividend calendar…
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((e, i) => (
              <div key={`${e.symbol}-${i}`} className="border border-line rounded-xl p-4">
                <div className="text-sm font-semibold text-heading">{NAME_BY_SYMBOL.get(e.symbol) ?? e.symbol}</div>
                <div className="text-[11px] text-foreground/50">{e.symbol}</div>
                <div className="flex justify-between text-xs text-foreground/60 mt-3 pt-3 border-t border-line">
                  <span>
                    Ex-date
                    <br />
                    <b className="text-heading font-mono">{e.exDate}</b>
                  </span>
                  <span className="text-right">
                    Per share
                    <br />
                    <b className="text-heading font-mono">{e.amount !== null ? `₹${e.amount.toFixed(2)}` : "—"}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

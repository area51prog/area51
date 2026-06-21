"use client";

import { CalendarClock, IndianRupee } from "lucide-react";
import { DIVIDENDS, getStock } from "@/lib/mock-data";
import { usePortfolio } from "@/lib/usePortfolio";
import { formatDate, formatINR } from "@/lib/format";
import { Card } from "@/components/ui";

const TODAY = new Date("2026-06-20");

export default function DividendsPage() {
  const { holdings, ready } = usePortfolio();
  const held = new Set(holdings.map((h) => h.symbol));
  const events = DIVIDENDS.filter((d) => held.has(d.symbol)).flatMap((d) => {
    const holding = holdings.find((h) => h.symbol === d.symbol);
    const stock = getStock(d.symbol);
    if (!holding || !stock) return [];
    const total = d.amountPerShare * holding.quantity;
    return [{ ...d, stock, holding, total }];
  });

  const upcoming = events.filter((e) => new Date(e.exDate) >= TODAY).sort((a, b) => a.exDate.localeCompare(b.exDate));
  const past = events.filter((e) => new Date(e.exDate) < TODAY).sort((a, b) => b.exDate.localeCompare(a.exDate));

  const projectedIncome = upcoming.reduce((sum, e) => sum + e.total, 0);
  const nextEvent = upcoming[0];

  const byMonth = upcoming.reduce<Record<string, typeof upcoming>>((acc, e) => {
    const key = new Date(e.exDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    acc[key] = acc[key] ?? [];
    acc[key].push(e);
    return acc;
  }, {});

  if (!ready) return null;

  if (holdings.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">
          No dividends yet — add holdings to your portfolio to see projected dividend income and upcoming ex-dividend
          dates here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <IndianRupee size={14} /> Projected dividend income
          </div>
          <div className="text-2xl font-bold text-up mt-2">₹{formatINR(projectedIncome, 0)}</div>
          <div className="text-xs text-foreground/50 mt-1">Next 12 months, across {upcoming.length} payouts</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50 uppercase tracking-wide">
            <CalendarClock size={14} /> Next ex-dividend date
          </div>
          {nextEvent ? (
            <>
              <div className="text-2xl font-bold text-heading mt-2">{nextEvent.stock.symbol}</div>
              <div className="text-xs text-foreground/50 mt-1">
                Ex-date {formatDate(nextEvent.exDate)} · ₹{nextEvent.amountPerShare}/share
              </div>
            </>
          ) : (
            <div className="text-sm text-foreground/50 mt-2">No upcoming dividends</div>
          )}
        </Card>
        <Card>
          <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">Dividend-paying holdings</div>
          <div className="text-2xl font-bold text-heading mt-2">
            {new Set(events.map((e) => e.symbol)).size} / {holdings.length}
          </div>
          <div className="text-xs text-foreground/50 mt-1">stocks in your portfolio</div>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Upcoming calendar</h3>
        {Object.keys(byMonth).length === 0 ? (
          <Card>
            <p className="text-sm text-foreground/50 py-4 text-center">No upcoming dividends for your current holdings.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(byMonth).map(([month, evs]) => (
              <Card key={month}>
                <h4 className="text-sm font-semibold text-heading mb-3">{month}</h4>
                <div className="divide-y divide-line">
                  {evs.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-semibold text-heading">
                          {e.stock.symbol} <span className="text-xs font-normal text-foreground/50">· {e.type}</span>
                        </div>
                        <div className="text-xs text-foreground/50">
                          Ex-date {formatDate(e.exDate)} · Pays {formatDate(e.paymentDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-up">+₹{formatINR(e.total, 0)}</div>
                        <div className="text-xs text-foreground/50">₹{e.amountPerShare}/share × {e.holding.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide mb-3">Dividend history</h3>
        <Card>
          {past.length === 0 ? (
            <p className="text-sm text-foreground/50 py-4 text-center">No past dividends recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                  <th className="py-2 font-semibold">Stock</th>
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold text-right">Ex-date</th>
                  <th className="py-2 font-semibold text-right">Per share</th>
                  <th className="py-2 font-semibold text-right">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {past.map((e, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-semibold text-heading">{e.stock.symbol}</td>
                    <td className="py-2.5 text-foreground/60">{e.type}</td>
                    <td className="py-2.5 text-right">{formatDate(e.exDate)}</td>
                    <td className="py-2.5 text-right">₹{e.amountPerShare}</td>
                    <td className="py-2.5 text-right font-semibold text-up">+₹{formatINR(e.total, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

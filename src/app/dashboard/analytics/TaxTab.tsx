"use client";

import { Lot, Position } from "@/lib/usePortfolio";
import { Transaction } from "@/lib/useTransactions";
import { computeRealizedVsUnrealized, findTaxLossCandidates, classifyHoldingTerm } from "@/lib/analytics";
import { formatDate, formatINRCompact } from "@/lib/format";
import { Card, Stat } from "@/components/ui";

function TermBadge({ term }: { term: "short" | "long" }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold rounded-full px-1.5 py-0.5 ${
        term === "long" ? "text-up bg-up/10" : "text-foreground/60 bg-foreground/10"
      }`}
    >
      {term === "long" ? "Long-term" : "Short-term"}
    </span>
  );
}

export default function TaxTab({
  positions,
  lots,
  transactions,
  priceBySymbol,
}: {
  positions: Position[];
  lots: Lot[];
  transactions: Transaction[];
  priceBySymbol: Record<string, number>;
}) {
  const { realized, unrealized } = computeRealizedVsUnrealized(positions, transactions, priceBySymbol);
  const candidates = findTaxLossCandidates(lots, priceBySymbol);

  if (lots.length === 0 && transactions.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">
          Add holdings and trades to see realized/unrealized P&amp;L and tax-loss insights here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line h-full gap-4 sm:gap-0">
          <Stat
            label="Realized P&L"
            value={`${realized >= 0 ? "+" : ""}${formatINRCompact(realized)}`}
            tone={realized >= 0 ? "up" : "down"}
          />
          <Stat
            label="Unrealized P&L"
            value={`${unrealized >= 0 ? "+" : ""}${formatINRCompact(unrealized)}`}
            tone={unrealized >= 0 ? "up" : "down"}
          />
        </div>
      </Card>

      <Card title="Open lots by holding term">
        {lots.length === 0 ? (
          <p className="text-sm text-foreground/50 py-8 text-center">No open lots.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                  <th className="py-2 font-semibold">Stock</th>
                  <th className="py-2 font-semibold">Buy date</th>
                  <th className="py-2 font-semibold">Term</th>
                  <th className="py-2 font-semibold text-right">Qty</th>
                  <th className="py-2 font-semibold text-right">Avg. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="py-2.5 font-semibold text-heading">{lot.symbol}</td>
                    <td className="py-2.5">{formatDate(lot.buyDate)}</td>
                    <td className="py-2.5">
                      <TermBadge term={classifyHoldingTerm(lot.buyDate)} />
                    </td>
                    <td className="py-2.5 text-right">{lot.quantity}</td>
                    <td className="py-2.5 text-right">₹{lot.avgPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Tax-loss harvesting candidates">
        {candidates.length === 0 ? (
          <p className="text-sm text-foreground/50 py-8 text-center">No open lots are currently sitting at a loss.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-xs text-foreground/40 uppercase tracking-wide border-b border-line">
                  <th className="py-2 font-semibold">Stock</th>
                  <th className="py-2 font-semibold">Term</th>
                  <th className="py-2 font-semibold text-right">Qty</th>
                  <th className="py-2 font-semibold text-right">Avg. cost</th>
                  <th className="py-2 font-semibold text-right">Current</th>
                  <th className="py-2 font-semibold text-right">Unrealized loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {candidates.map((c, i) => (
                  <tr key={`${c.symbol}-${i}`}>
                    <td className="py-2.5 font-semibold text-heading">{c.symbol}</td>
                    <td className="py-2.5">
                      <TermBadge term={c.term} />
                    </td>
                    <td className="py-2.5 text-right">{c.quantity}</td>
                    <td className="py-2.5 text-right">₹{c.avgPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right">₹{c.currentPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold text-down">{formatINRCompact(c.unrealizedLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import clsx from "clsx";
import { usePortfolio, SUMMARY_ID } from "@/lib/usePortfolio";
import { useTransactions } from "@/lib/useTransactions";
import { useProfile } from "@/lib/useProfile";
import { useQuotes } from "@/lib/useQuotes";
import { getStock } from "@/lib/mock-data";
import { priceMapFromQuotes } from "@/lib/analytics";
import { Card } from "@/components/ui";
import PremiumGate from "@/components/PremiumGate";
import PerformanceTab from "./PerformanceTab";
import RiskTab from "./RiskTab";
import TradeBehaviorTab from "./TradeBehaviorTab";
import TaxTab from "./TaxTab";

const TABS = ["Performance", "Risk & Diversification", "Trade Behavior", "Tax & P&L"] as const;
type Tab = (typeof TABS)[number];

export default function AnalyticsPage() {
  return (
    <PremiumGate feature="Analytics">
      <AnalyticsContent />
    </PremiumGate>
  );
}

function AnalyticsContent() {
  const { lists, activePortfolioId, switchPortfolio, lots, positions, ready: portfolioReady } = usePortfolio();
  const { transactions, ready: transactionsReady } = useTransactions();
  const { isPremium } = useProfile();
  const { quotes } = useQuotes(positions.map((p) => p.symbol));
  const [tab, setTab] = useState<Tab>("Performance");

  const switcherLists =
    isPremium && lists.length > 1 ? [{ id: SUMMARY_ID, name: "All Portfolios" }, ...lists] : lists;

  const priceBySymbol = priceMapFromQuotes(positions, quotes, (symbol) => getStock(symbol)?.price ?? null);

  const totalValue = positions.reduce((sum, p) => sum + (priceBySymbol[p.symbol] ?? p.avgPrice) * p.quantity, 0);
  const totalInvested = positions.reduce((sum, p) => sum + p.avgPrice * p.quantity, 0);

  if (!portfolioReady || !transactionsReady) return null;

  return (
    <div className="space-y-5">
      {switcherLists.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <select
            value={activePortfolioId ?? ""}
            onChange={(e) => switchPortfolio(e.target.value)}
            className="rounded-lg border border-line bg-surface text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          >
            {switcherLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Card className="p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "text-sm font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors",
                tab === t ? "bg-brand text-white" : "text-foreground/60 hover:bg-background hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      {tab === "Performance" && (
        <PerformanceTab positions={positions} priceBySymbol={priceBySymbol} totalValue={totalValue} totalInvested={totalInvested} />
      )}
      {tab === "Risk & Diversification" && <RiskTab positions={positions} priceBySymbol={priceBySymbol} />}
      {tab === "Trade Behavior" && <TradeBehaviorTab transactions={transactions} lots={lots} />}
      {tab === "Tax & P&L" && (
        <TaxTab positions={positions} lots={lots} transactions={transactions} priceBySymbol={priceBySymbol} />
      )}
    </div>
  );
}

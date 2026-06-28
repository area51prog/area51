"use client";

import { useState } from "react";
import clsx from "clsx";
import { usePortfolio } from "@/lib/usePortfolio";
import { useCorporateActions } from "@/lib/useCorporateActions";
import { Card } from "@/components/ui";
import DividendsTab from "./DividendsTab";
import CorporateActionsTab from "./CorporateActionsTab";

const TABS = ["Dividends", "Corporate Actions"] as const;
type Tab = (typeof TABS)[number];

export default function EventsPage() {
  const { positions, ready: portfolioReady } = usePortfolio();
  const symbols = positions.map((p) => p.symbol);
  const { events, ready: eventsReady } = useCorporateActions(symbols);
  const [tab, setTab] = useState<Tab>("Dividends");
  const ready = portfolioReady && eventsReady;

  if (!ready) return null;

  if (positions.length === 0) {
    return (
      <Card>
        <p className="text-sm text-foreground/50 py-10 text-center">
          No events yet — add holdings to your portfolio to see dividend income and corporate actions here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

      {tab === "Dividends" && <DividendsTab positions={positions} events={events} />}
      {tab === "Corporate Actions" && <CorporateActionsTab events={events} />}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { useProfile } from "./useProfile";
import { createClient } from "./supabase/client";

export interface NewHolding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  buyDate: string;
}

export interface PortfolioMeta {
  id: string;
  name: string;
}

export interface Lot {
  id: string;
  portfolioId: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  buyDate: string;
  createdAt: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

// A normalized trade to replay into the portfolio (from a broker CSV import).
export interface ImportTrade {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  tradeDate: string; // YYYY-MM-DD
}

export const SUMMARY_ID = "ALL";

const LOT_COLUMNS = "id, portfolio_id, symbol, quantity, avg_price, buy_date, created_at";

function toLot(row: {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  avg_price: number;
  buy_date: string;
  created_at: string;
}): Lot {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    buyDate: row.buy_date,
    createdAt: row.created_at,
  };
}

// FIFO consumption of a symbol's lots by a sell of `quantity` at `price`.
// Pure: returns which lots to delete/update, the realized P&L, and any
// unfilled shortfall. Shared by single-sell and the CSV trade-replay import.
function consumeFifo(
  lots: Lot[],
  quantity: number,
  price: number
): { deletes: string[]; updates: { id: string; quantity: number }[]; realizedPnl: number; shortfall: number } {
  const sorted = [...lots].sort((a, b) =>
    a.buyDate === b.buyDate ? a.createdAt.localeCompare(b.createdAt) : a.buyDate.localeCompare(b.buyDate)
  );
  let remaining = quantity;
  let realizedPnl = 0;
  const updates: { id: string; quantity: number }[] = [];
  const deletes: string[] = [];
  for (const lot of sorted) {
    if (remaining <= 0) break;
    if (lot.quantity <= remaining) {
      deletes.push(lot.id);
      remaining -= lot.quantity;
      realizedPnl += (price - lot.avgPrice) * lot.quantity;
    } else {
      updates.push({ id: lot.id, quantity: lot.quantity - remaining });
      realizedPnl += (price - lot.avgPrice) * remaining;
      remaining = 0;
    }
  }
  return { deletes, updates, realizedPnl, shortfall: remaining };
}

function aggregatePositions(lots: Lot[]): Position[] {
  const bySymbol = new Map<string, { quantity: number; cost: number }>();
  for (const lot of lots) {
    const entry = bySymbol.get(lot.symbol) ?? { quantity: 0, cost: 0 };
    entry.quantity += lot.quantity;
    entry.cost += lot.quantity * lot.avgPrice;
    bySymbol.set(lot.symbol, entry);
  }
  return Array.from(bySymbol.entries()).map(([symbol, { quantity, cost }]) => ({
    symbol,
    quantity,
    avgPrice: quantity ? cost / quantity : 0,
  }));
}

export function usePortfolio() {
  const { user } = useAuth();
  const { isPremium, ready: profileReady } = useProfile();
  const [lists, setLists] = useState<PortfolioMeta[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setLists([]);
      setActivePortfolioId(null);
      setLots([]);

      setReady(false);
      return;
    }

    // Wait for the profile tier to load — the default-selection logic below needs to
    // know isPremium up front, otherwise it would always default to a single portfolio.
    if (!profileReady) return;

    let cancelled = false;

    supabase
      .from("portfolios")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(async ({ data }) => {
        if (cancelled) return;
        const fetchedLists = data ?? [];
        setLists(fetchedLists);

        // Always land on "All Portfolios" for multi-portfolio Premium users on a fresh
        // mount (e.g. after navigating away and back) — a specific-portfolio selection
        // is a transient, in-session choice, not something we remember across visits.
        const activeId = isPremium && fetchedLists.length > 1 ? SUMMARY_ID : fetchedLists[0]?.id ?? null;
        setActivePortfolioId(activeId);

        if (!activeId) {
          setLots([]);
          setReady(true);
          return;
        }

        const portfolioIds = activeId === SUMMARY_ID ? fetchedLists.map((l) => l.id) : [activeId];
        if (portfolioIds.length === 0) {
          setLots([]);
          setReady(true);
          return;
        }
        const { data: items } = await supabase
          .from("portfolio_holdings")
          .select(LOT_COLUMNS)
          .in("portfolio_id", portfolioIds)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        setLots((items ?? []).map(toLot));
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase, profileReady, isPremium]);

  async function loadLots(portfolioIds: string[]) {
    if (portfolioIds.length === 0) {
      setLots([]);
      return;
    }
    const { data: items } = await supabase
      .from("portfolio_holdings")
      .select(LOT_COLUMNS)
      .in("portfolio_id", portfolioIds)
      .order("created_at", { ascending: false });
    setLots((items ?? []).map(toLot));
  }

  async function switchPortfolio(portfolioId: string) {
    if (portfolioId === activePortfolioId) return;
    setActivePortfolioId(portfolioId);
    setReady(false);
    const portfolioIds = portfolioId === SUMMARY_ID ? lists.map((l) => l.id) : [portfolioId];
    await loadLots(portfolioIds);
    setReady(true);
  }

  async function createPortfolio(name: string): Promise<{ error?: string }> {
    if (!user) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("portfolios")
      .insert({ user_id: user.id, name })
      .select("id, name")
      .single();
    if (error || !data) return { error: error?.message ?? "Failed to create portfolio" };
    setLists((prev) => [...prev, data]);
    await switchPortfolio(data.id);
    return {};
  }

  async function renamePortfolio(id: string, name: string): Promise<{ error?: string }> {
    const previous = lists;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    const { error } = await supabase.from("portfolios").update({ name }).eq("id", id);
    if (error) {
      setLists(previous);
      return { error: error.message };
    }
    return {};
  }

  async function deletePortfolio(id: string): Promise<{ error?: string }> {
    if (lists.length <= 1) return { error: "You must keep at least one portfolio." };
    const previous = lists;
    const remaining = lists.filter((l) => l.id !== id);
    setLists(remaining);
    const { error } = await supabase.from("portfolios").delete().eq("id", id);
    if (error) {
      setLists(previous);
      return {
        error: error.message.includes("last_list_blocked")
          ? "You must keep at least one portfolio."
          : error.message,
      };
    }
    if (id === activePortfolioId) await switchPortfolio(remaining[0].id);
    else if (activePortfolioId === SUMMARY_ID) await loadLots(remaining.map((l) => l.id));
    return {};
  }

  async function logTransaction(input: {
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    price: number;
    txnDate: string;
    realizedPnl: number | null;
  }) {
    await logTransactions([input]);
  }

  async function logTransactions(
    inputs: {
      symbol: string;
      side: "buy" | "sell";
      quantity: number;
      price: number;
      txnDate: string;
      realizedPnl: number | null;
    }[]
  ) {
    if (!user || !activePortfolioId || activePortfolioId === SUMMARY_ID || inputs.length === 0) return;
    await supabase.from("transactions").insert(
      inputs.map((input) => ({
        user_id: user.id,
        portfolio_id: activePortfolioId,
        symbol: input.symbol,
        side: input.side,
        quantity: input.quantity,
        price: input.price,
        txn_date: input.txnDate,
        realized_pnl: input.realizedPnl,
      }))
    );
  }

  async function buyHolding(input: NewHolding): Promise<{ error?: string }> {
    if (!user || !activePortfolioId || activePortfolioId === SUMMARY_ID) return { error: "Select a single portfolio first" };

    const { data, error } = await supabase
      .from("portfolio_holdings")
      .insert({
        user_id: user.id,
        portfolio_id: activePortfolioId,
        symbol: input.symbol,
        quantity: input.quantity,
        avg_price: input.avgPrice,
        buy_date: input.buyDate,
      })
      .select(LOT_COLUMNS)
      .single();

    if (error || !data) return { error: error?.message ?? "Failed to add holding" };

    setLots((prev) => [toLot(data), ...prev]);
    await logTransaction({
      symbol: input.symbol,
      side: "buy",
      quantity: input.quantity,
      price: input.avgPrice,
      txnDate: input.buyDate,
      realizedPnl: null,
    });
    return {};
  }

  async function bulkAddHoldings(inputs: NewHolding[]): Promise<{ inserted: number; error?: string }> {
    if (!user || !activePortfolioId || activePortfolioId === SUMMARY_ID) return { inserted: 0, error: "Select a single portfolio first" };
    if (inputs.length === 0) return { inserted: 0 };

    const { data, error } = await supabase
      .from("portfolio_holdings")
      .insert(
        inputs.map((input) => ({
          user_id: user.id,
          portfolio_id: activePortfolioId,
          symbol: input.symbol,
          quantity: input.quantity,
          avg_price: input.avgPrice,
          buy_date: input.buyDate,
        }))
      )
      .select(LOT_COLUMNS);

    if (error || !data) return { inserted: 0, error: error?.message ?? "Failed to add holdings" };

    setLots((prev) => [...data.map(toLot), ...prev]);
    await logTransactions(
      inputs.map((input) => ({
        symbol: input.symbol,
        side: "buy" as const,
        quantity: input.quantity,
        price: input.avgPrice,
        txnDate: input.buyDate,
        realizedPnl: null,
      }))
    );
    return { inserted: data.length };
  }

  // Replays a set of normalized buy/sell trades (from a broker CSV import) into
  // the active portfolio, chronologically. Buys create lots; sells consume lots
  // FIFO with realized P&L — including lots created earlier in the same import.
  // Everything is computed in memory first, then persisted in batched writes.
  async function importTrades(
    trades: ImportTrade[]
  ): Promise<{ inserted: number; sold: number; skipped: number; error?: string }> {
    if (!user || !activePortfolioId || activePortfolioId === SUMMARY_ID)
      return { inserted: 0, sold: 0, skipped: 0, error: "Select a single portfolio first" };
    if (trades.length === 0) return { inserted: 0, sold: 0, skipped: 0 };

    // Chronological; buys before sells on the same date so a same-day sell can
    // draw on that day's buys.
    const sorted = [...trades].sort((a, b) =>
      a.tradeDate === b.tradeDate ? (a.side === b.side ? 0 : a.side === "buy" ? -1 : 1) : a.tradeDate.localeCompare(b.tradeDate)
    );

    // Working set: existing lots for this portfolio plus lots created during the
    // replay (tagged isNew with a synthetic id/createdAt). consumeFifo works on
    // this uniformly; we diff against the originals afterwards to decide DB ops.
    type WorkingLot = Lot & { isNew: boolean };
    let working: WorkingLot[] = lots
      .filter((l) => l.portfolioId === activePortfolioId)
      .map((l) => ({ ...l, isNew: false }));
    const originals = new Map(working.map((l) => [l.id, l.quantity] as const));

    const txns: {
      symbol: string;
      side: "buy" | "sell";
      quantity: number;
      price: number;
      txnDate: string;
      realizedPnl: number | null;
    }[] = [];
    let inserted = 0;
    let sold = 0;
    let skipped = 0;
    let counter = 0;

    for (const t of sorted) {
      if (t.side === "buy") {
        working.push({
          id: `new:${counter}`,
          portfolioId: activePortfolioId,
          symbol: t.symbol,
          quantity: t.quantity,
          avgPrice: t.price,
          buyDate: t.tradeDate,
          // Synthetic, monotonic — orders in-import lots by insertion for FIFO ties.
          createdAt: new Date(Date.now() + counter).toISOString(),
          isNew: true,
        });
        counter++;
        txns.push({ symbol: t.symbol, side: "buy", quantity: t.quantity, price: t.price, txnDate: t.tradeDate, realizedPnl: null });
      } else {
        const symLots = working.filter((l) => l.symbol === t.symbol);
        const held = symLots.reduce((s, l) => s + l.quantity, 0);
        if (t.quantity > held) {
          // Can't sell more than held at this point in the timeline — skip it.
          skipped++;
          continue;
        }
        const { deletes, updates, realizedPnl } = consumeFifo(symLots, t.quantity, t.price);
        working = working
          .filter((l) => !deletes.includes(l.id))
          .map((l) => {
            const u = updates.find((u) => u.id === l.id);
            return u ? { ...l, quantity: u.quantity } : l;
          });
        txns.push({ symbol: t.symbol, side: "sell", quantity: t.quantity, price: t.price, txnDate: t.tradeDate, realizedPnl });
        sold++;
      }
    }

    // Diff the final working set against the originals to derive DB operations.
    const finalById = new Map(working.map((l) => [l.id, l] as const));
    const existingDeletes = [...originals.keys()].filter((id) => !finalById.has(id));
    const existingUpdates = [...finalById.values()].filter(
      (l) => !l.isNew && originals.get(l.id) !== l.quantity
    );
    const newInserts = working.filter((l) => l.isNew && l.quantity > 0);

    try {
      if (existingDeletes.length > 0) {
        const { error } = await supabase.from("portfolio_holdings").delete().in("id", existingDeletes);
        if (error) throw error;
      }
      for (const u of existingUpdates) {
        const { error } = await supabase.from("portfolio_holdings").update({ quantity: u.quantity }).eq("id", u.id);
        if (error) throw error;
      }
      if (newInserts.length > 0) {
        const { error } = await supabase.from("portfolio_holdings").insert(
          newInserts.map((l) => ({
            user_id: user.id,
            portfolio_id: activePortfolioId,
            symbol: l.symbol,
            quantity: l.quantity,
            avg_price: l.avgPrice,
            buy_date: l.buyDate,
          }))
        );
        if (error) throw error;
        inserted = newInserts.length;
      }
      await logTransactions(txns);
    } catch (e) {
      return { inserted: 0, sold: 0, skipped, error: e instanceof Error ? e.message : "Failed to import trades" };
    }

    // Reload from the DB so local state exactly reflects the persisted lots.
    await loadLots([activePortfolioId]);
    return { inserted, sold, skipped };
  }

  async function sellHolding(symbol: string, quantity: number, price: number, sellDate: string): Promise<{ error?: string }> {
    if (!activePortfolioId || activePortfolioId === SUMMARY_ID) return { error: "Select a single portfolio first" };
    if (quantity <= 0) return { error: "Enter a quantity greater than zero." };

    const symbolLots = lots.filter((l) => l.portfolioId === activePortfolioId && l.symbol === symbol);

    const heldQuantity = symbolLots.reduce((sum, l) => sum + l.quantity, 0);
    if (quantity > heldQuantity) return { error: "Cannot sell more than you hold." };

    const { deletes, updates, realizedPnl } = consumeFifo(symbolLots, quantity, price);

    const previous = lots;
    setLots((prev) =>
      prev
        .filter((l) => !deletes.includes(l.id))
        .map((l) => {
          const update = updates.find((u) => u.id === l.id);
          return update ? { ...l, quantity: update.quantity } : l;
        })
    );

    if (deletes.length > 0) {
      const { error } = await supabase.from("portfolio_holdings").delete().in("id", deletes);
      if (error) {
        setLots(previous);
        return { error: error.message };
      }
    }
    for (const update of updates) {
      const { error } = await supabase.from("portfolio_holdings").update({ quantity: update.quantity }).eq("id", update.id);
      if (error) {
        setLots(previous);
        return { error: error.message };
      }
    }

    await logTransaction({ symbol, side: "sell", quantity, price, txnDate: sellDate, realizedPnl });
    return {};
  }

  async function deletePosition(symbol: string): Promise<{ error?: string }> {
    if (!activePortfolioId || activePortfolioId === SUMMARY_ID) return { error: "Select a single portfolio first" };
    const previous = lots;
    setLots((prev) => prev.filter((l) => !(l.portfolioId === activePortfolioId && l.symbol === symbol)));
    const { error } = await supabase
      .from("portfolio_holdings")
      .delete()
      .eq("portfolio_id", activePortfolioId)
      .eq("symbol", symbol);
    if (error) {
      setLots(previous);
      return { error: error.message };
    }
    return {};
  }

  const positions = useMemo(() => aggregatePositions(lots), [lots]);

  return {
    lists,
    activePortfolioId,
    isSummary: activePortfolioId === SUMMARY_ID,
    switchPortfolio,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    lots,
    positions,
    ready,
    buyHolding,
    bulkAddHoldings,
    importTrades,
    sellHolding,
    deletePosition,
  };
}

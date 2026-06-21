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

export const SUMMARY_ID = "ALL";

const ACTIVE_KEY = "area51_active_portfolio";
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
  const { isPremium } = useProfile();
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

        const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null;
        const storedIsValid = stored === SUMMARY_ID ? isPremium && fetchedLists.length > 1 : fetchedLists.some((l) => l.id === stored);
        const activeId = storedIsValid
          ? stored
          : isPremium && fetchedLists.length > 1
            ? SUMMARY_ID
            : fetchedLists[0]?.id ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isPremium intentionally only used for the initial default-selection decision
  }, [user, supabase]);

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
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY, portfolioId);
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
    return {};
  }

  async function sellHolding(symbol: string, quantity: number): Promise<{ error?: string }> {
    if (!activePortfolioId || activePortfolioId === SUMMARY_ID) return { error: "Select a single portfolio first" };
    if (quantity <= 0) return { error: "Enter a quantity greater than zero." };

    const symbolLots = lots
      .filter((l) => l.portfolioId === activePortfolioId && l.symbol === symbol)
      .sort((a, b) => (a.buyDate === b.buyDate ? a.createdAt.localeCompare(b.createdAt) : a.buyDate.localeCompare(b.buyDate)));

    const heldQuantity = symbolLots.reduce((sum, l) => sum + l.quantity, 0);
    if (quantity > heldQuantity) return { error: "Cannot sell more than you hold." };

    let remaining = quantity;
    const updates: { id: string; quantity: number }[] = [];
    const deletes: string[] = [];

    for (const lot of symbolLots) {
      if (remaining <= 0) break;
      if (lot.quantity <= remaining) {
        deletes.push(lot.id);
        remaining -= lot.quantity;
      } else {
        updates.push({ id: lot.id, quantity: lot.quantity - remaining });
        remaining = 0;
      }
    }

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
    sellHolding,
    deletePosition,
  };
}

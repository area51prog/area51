"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";
import { Holding } from "./types";

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

const ACTIVE_KEY = "area51_active_portfolio";

function toHolding(row: { id: string; symbol: string; quantity: number; avg_price: number; buy_date: string }): Holding {
  return {
    id: row.id,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    buyDate: row.buy_date,
  };
}

export function usePortfolio() {
  const { user } = useAuth();
  const [lists, setLists] = useState<PortfolioMeta[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setLists([]);
      setActivePortfolioId(null);
      setHoldings([]);

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
        const activeId = fetchedLists.find((l) => l.id === stored)?.id ?? fetchedLists[0]?.id ?? null;
        setActivePortfolioId(activeId);

        if (!activeId) {
          setHoldings([]);
          setReady(true);
          return;
        }

        const { data: items } = await supabase
          .from("portfolio_holdings")
          .select("id, symbol, quantity, avg_price, buy_date")
          .eq("portfolio_id", activeId)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        setHoldings((items ?? []).map(toHolding));
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  async function switchPortfolio(portfolioId: string) {
    if (portfolioId === activePortfolioId) return;
    setActivePortfolioId(portfolioId);
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY, portfolioId);
    setReady(false);
    const { data: items } = await supabase
      .from("portfolio_holdings")
      .select("id, symbol, quantity, avg_price, buy_date")
      .eq("portfolio_id", portfolioId)
      .order("created_at", { ascending: false });
    setHoldings((items ?? []).map(toHolding));
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

  async function addHolding(input: NewHolding): Promise<{ error?: string }> {
    if (!user || !activePortfolioId) return { error: "Not signed in" };

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
      .select("id, symbol, quantity, avg_price, buy_date")
      .single();

    if (error || !data) return { error: error?.message ?? "Failed to add holding" };

    setHoldings((prev) => [toHolding(data), ...prev]);
    return {};
  }

  async function removeHolding(id: string): Promise<{ error?: string }> {
    const previous = holdings;
    setHoldings((prev) => prev.filter((h) => h.id !== id));
    const { error } = await supabase.from("portfolio_holdings").delete().eq("id", id);
    if (error) {
      setHoldings(previous);
      return { error: error.message };
    }
    return {};
  }

  return {
    lists,
    activePortfolioId,
    switchPortfolio,
    createPortfolio,
    holdings,
    ready,
    addHolding,
    removeHolding,
  };
}

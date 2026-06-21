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

export function usePortfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setHoldings([]);
       
      setReady(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("portfolio_holdings")
      .select("id, symbol, quantity, avg_price, buy_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setHoldings(
          (data ?? []).map((row) => ({
            id: row.id,
            symbol: row.symbol,
            quantity: Number(row.quantity),
            avgPrice: Number(row.avg_price),
            buyDate: row.buy_date,
          }))
        );
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  async function addHolding(input: NewHolding): Promise<{ error?: string }> {
    if (!user) return { error: "Not signed in" };

    const { data, error } = await supabase
      .from("portfolio_holdings")
      .insert({
        user_id: user.id,
        symbol: input.symbol,
        quantity: input.quantity,
        avg_price: input.avgPrice,
        buy_date: input.buyDate,
      })
      .select("id, symbol, quantity, avg_price, buy_date")
      .single();

    if (error || !data) return { error: error?.message ?? "Failed to add holding" };

    setHoldings((prev) => [
      {
        id: data.id,
        symbol: data.symbol,
        quantity: Number(data.quantity),
        avgPrice: Number(data.avg_price),
        buyDate: data.buy_date,
      },
      ...prev,
    ]);
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

  return { holdings, ready, addHolding, removeHolding };
}

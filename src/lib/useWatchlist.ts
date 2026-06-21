"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";

export function useWatchlist() {
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setSymbols([]);
       
      setReady(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("watchlist")
      .select("symbol")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setSymbols((data ?? []).map((row) => row.symbol));
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  async function add(symbol: string) {
    if (!user || symbols.includes(symbol)) return;
    setSymbols((prev) => [...prev, symbol]);
    const { error } = await supabase.from("watchlist").insert({ user_id: user.id, symbol });
    if (error) setSymbols((prev) => prev.filter((s) => s !== symbol));
  }

  async function remove(symbol: string) {
    if (!user) return;
    setSymbols((prev) => prev.filter((s) => s !== symbol));
    const { error } = await supabase.from("watchlist").delete().eq("user_id", user.id).eq("symbol", symbol);
    if (error) setSymbols((prev) => [...prev, symbol]);
  }

  function toggle(symbol: string) {
    if (symbols.includes(symbol)) remove(symbol);
    else add(symbol);
  }

  return { symbols, ready, add, remove, toggle };
}

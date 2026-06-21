"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";

export interface WatchlistMeta {
  id: string;
  name: string;
}

const ACTIVE_KEY = "area51_active_watchlist";

export function useWatchlist() {
  const { user } = useAuth();
  const [lists, setLists] = useState<WatchlistMeta[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setLists([]);
      setActiveListId(null);
      setSymbols([]);

      setReady(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(async ({ data }) => {
        if (cancelled) return;
        const fetchedLists = data ?? [];
        setLists(fetchedLists);

        const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null;
        const activeId = fetchedLists.find((l) => l.id === stored)?.id ?? fetchedLists[0]?.id ?? null;
        setActiveListId(activeId);

        if (!activeId) {
          setSymbols([]);
          setReady(true);
          return;
        }

        const { data: items } = await supabase.from("watchlist").select("symbol").eq("watchlist_id", activeId);
        if (cancelled) return;
        setSymbols((items ?? []).map((row) => row.symbol));
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  async function switchList(listId: string) {
    if (listId === activeListId) return;
    setActiveListId(listId);
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY, listId);
    setReady(false);
    const { data: items } = await supabase.from("watchlist").select("symbol").eq("watchlist_id", listId);
    setSymbols((items ?? []).map((row) => row.symbol));
    setReady(true);
  }

  async function createList(name: string): Promise<{ error?: string }> {
    if (!user) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("watchlists")
      .insert({ user_id: user.id, name })
      .select("id, name")
      .single();
    if (error || !data) return { error: error?.message ?? "Failed to create watchlist" };
    setLists((prev) => [...prev, data]);
    await switchList(data.id);
    return {};
  }

  async function renameList(id: string, name: string): Promise<{ error?: string }> {
    const previous = lists;
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    const { error } = await supabase.from("watchlists").update({ name }).eq("id", id);
    if (error) {
      setLists(previous);
      return { error: error.message };
    }
    return {};
  }

  async function deleteList(id: string): Promise<{ error?: string }> {
    if (lists.length <= 1) return { error: "You must keep at least one watchlist." };
    const previous = lists;
    const remaining = lists.filter((l) => l.id !== id);
    setLists(remaining);
    const { error } = await supabase.from("watchlists").delete().eq("id", id);
    if (error) {
      setLists(previous);
      return {
        error: error.message.includes("last_list_blocked")
          ? "You must keep at least one watchlist."
          : error.message,
      };
    }
    if (id === activeListId) await switchList(remaining[0].id);
    return {};
  }

  async function add(symbol: string): Promise<{ error?: string }> {
    if (!user || !activeListId || symbols.includes(symbol)) return {};
    setSymbols((prev) => [...prev, symbol]);
    const { error } = await supabase
      .from("watchlist")
      .insert({ user_id: user.id, watchlist_id: activeListId, symbol });
    if (error) {
      setSymbols((prev) => prev.filter((s) => s !== symbol));
      return { error: error.message };
    }
    return {};
  }

  async function remove(symbol: string) {
    if (!user || !activeListId) return;
    setSymbols((prev) => prev.filter((s) => s !== symbol));
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("watchlist_id", activeListId)
      .eq("symbol", symbol);
    if (error) setSymbols((prev) => [...prev, symbol]);
  }

  function toggle(symbol: string) {
    if (symbols.includes(symbol)) remove(symbol);
    else add(symbol);
  }

  return {
    lists,
    activeListId,
    switchList,
    createList,
    renameList,
    deleteList,
    symbols,
    ready,
    add,
    remove,
    toggle,
  };
}

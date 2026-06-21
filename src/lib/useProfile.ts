"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";

export type Tier = "free" | "premium";

export function useProfile() {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier | null>(null);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setTier(null);
      setReady(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setTier((data?.tier as Tier) ?? "free");
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  return {
    tier,
    ready,
    isPremium: tier === "premium",
    maxLists: tier === "premium" ? 5 : 1,
    maxItemsPerList: tier === "premium" ? 100 : 50,
  };
}

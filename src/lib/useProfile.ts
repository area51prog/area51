"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";

export type Tier = "free" | "premium";
export type Role = "user" | "administrator";

export function useProfile() {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setTier(null);
      setRole(null);
      setReady(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("profiles")
      .select("tier, role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setTier((data?.tier as Tier) ?? "free");
        setRole((data?.role as Role) ?? "user");
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  return {
    tier,
    role,
    ready,
    isPremium: tier === "premium",
    isAdmin: role === "administrator",
    maxLists: tier === "premium" ? 5 : 1,
    maxItemsPerList: tier === "premium" ? 100 : 50,
  };
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";

export interface AppNotification {
  id: string;
  category: "account" | "watchlist" | "portfolio" | "dividend" | "research";
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

const NOTIFICATIONS_LIMIT = 20;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setNotifications([]);

      setReady(false);
      return;
    }

    let cancelled = false;

    function load() {
      supabase
        .from("notifications")
        .select("id, category, title, body, read_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATIONS_LIMIT)
        .then(({ data }) => {
          if (cancelled) return;
          setNotifications(
            (data ?? []).map((row) => ({
              id: row.id,
              category: row.category as AppNotification["category"],
              title: row.title,
              body: row.body,
              readAt: row.read_at,
              createdAt: row.created_at,
            }))
          );
          setReady(true);
        });
    }

    load();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  }

  async function markAllAsRead() {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    if (!user) return;
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return { notifications, unreadCount, ready, markAsRead, markAllAsRead };
}

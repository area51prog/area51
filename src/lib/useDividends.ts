"use client";

import { useEffect, useState } from "react";
import { DividendEvent } from "./types";

export function useDividends(symbols: string[]) {
  const [events, setEvents] = useState<DividendEvent[]>([]);
  const [ready, setReady] = useState(false);
  const key = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when there are no held symbols
      setEvents([]);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    fetch(`/api/dividends?symbols=${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((body: { ok: boolean; events?: DividendEvent[] }) => {
        if (cancelled) return;
        setEvents(body.events ?? []);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { events, ready };
}

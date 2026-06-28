"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { createClient } from "./supabase/client";

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  txnDate: string;
  realizedPnl: number | null;
}

const TXN_COLUMNS = "id, portfolio_id, symbol, side, quantity, price, txn_date, realized_pnl";

function toTransaction(row: {
  id: string;
  portfolio_id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  txn_date: string;
  realized_pnl: number | null;
}): Transaction {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    symbol: row.symbol,
    side: row.side as "buy" | "sell",
    quantity: Number(row.quantity),
    price: Number(row.price),
    txnDate: row.txn_date,
    realizedPnl: row.realized_pnl === null ? null : Number(row.realized_pnl),
  };
}

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state when the user signs out
      setTransactions([]);
      setReady(false);
      return;
    }

    let cancelled = false;

    supabase
      .from("transactions")
      .select(TXN_COLUMNS)
      .eq("user_id", user.id)
      .order("txn_date", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setTransactions((data ?? []).map(toTransaction));
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  async function updateTransaction(
    id: string,
    input: { quantity: number; price: number; txnDate: string }
  ): Promise<{ error?: string }> {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return { error: "Transaction not found" };

    // Sells carry a realized P&L computed against the cost basis of the lots consumed at
    // sale time. We don't store that cost basis directly, so back it out from the original
    // price/realizedPnl and re-apply it to the edited quantity/price to keep P&L consistent.
    let realizedPnl = existing.realizedPnl;
    if (existing.side === "sell" && existing.realizedPnl !== null && existing.quantity > 0) {
      const costBasisPerUnit = existing.price - existing.realizedPnl / existing.quantity;
      realizedPnl = (input.price - costBasisPerUnit) * input.quantity;
    }

    const previous = transactions;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, quantity: input.quantity, price: input.price, txnDate: input.txnDate, realizedPnl } : t))
    );

    const { error } = await supabase
      .from("transactions")
      .update({ quantity: input.quantity, price: input.price, txn_date: input.txnDate, realized_pnl: realizedPnl })
      .eq("id", id);
    if (error) {
      setTransactions(previous);
      return { error: error.message };
    }
    return {};
  }

  return { transactions, ready, updateTransaction };
}

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface StaleEntry<T> {
  payload: T;
  fetchedAt: string;
}

// Last-known-good snapshot of Upstox responses, used so the dashboard can
// keep showing real (if old) numbers instead of jumping straight to mock
// data when the Upstox token has expired.
export async function readStaleCache<T>(supabase: Client, cacheKey: string): Promise<StaleEntry<T> | null> {
  const { data } = await supabase
    .from("market_data_cache")
    .select("payload, fetched_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (!data) return null;
  return { payload: data.payload as T, fetchedAt: data.fetched_at };
}

export async function readStaleCacheMany<T>(
  supabase: Client,
  cacheKeys: string[]
): Promise<Map<string, StaleEntry<T>>> {
  if (cacheKeys.length === 0) return new Map();

  const { data } = await supabase
    .from("market_data_cache")
    .select("cache_key, payload, fetched_at")
    .in("cache_key", cacheKeys);

  const result = new Map<string, StaleEntry<T>>();
  for (const row of data ?? []) {
    result.set(row.cache_key, { payload: row.payload as T, fetchedAt: row.fetched_at });
  }
  return result;
}

export async function writeStaleCache(supabase: Client, cacheKey: string, payload: unknown): Promise<void> {
  await supabase.from("market_data_cache").upsert({
    cache_key: cacheKey,
    payload: payload as never,
    fetched_at: new Date().toISOString(),
  });
}

export async function writeStaleCacheMany(
  supabase: Client,
  entries: { cacheKey: string; payload: unknown }[]
): Promise<void> {
  if (entries.length === 0) return;
  const fetchedAt = new Date().toISOString();
  await supabase.from("market_data_cache").upsert(
    entries.map(({ cacheKey, payload }) => ({
      cache_key: cacheKey,
      payload: payload as never,
      fetched_at: fetchedAt,
    }))
  );
}

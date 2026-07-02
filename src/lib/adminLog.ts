import { createAdminClient } from "./supabase/admin";
import type { TablesInsert } from "./supabase/database.types";

/**
 * Server-side instrumentation helpers for the admin dashboard.
 *
 * Both helpers write via the service-role client (bypassing RLS) and are
 * fire-and-forget: they never throw, so a logging failure can't break the
 * request path that calls them. Reads are gated by RLS (admin-only).
 */

export type ApiProvider = "anthropic" | "upstox" | "finnhub" | "resend";

/**
 * Per-model Anthropic pricing in USD per 1M tokens (input / output).
 * UPDATE THIS TABLE when Anthropic pricing changes or new models are used.
 * Source: Anthropic pricing page. Sonnet-class default: $3 in / $15 out per MTok.
 */
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
};
const ANTHROPIC_PRICING_FALLBACK = { input: 3, output: 15 };

/** Estimate the USD cost of an Anthropic call from token counts. */
export function estimateAnthropicCost(
  model: string | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null {
  if (inputTokens == null && outputTokens == null) return null;
  const price = (model && ANTHROPIC_PRICING[model]) || ANTHROPIC_PRICING_FALLBACK;
  const inCost = ((inputTokens ?? 0) / 1_000_000) * price.input;
  const outCost = ((outputTokens ?? 0) / 1_000_000) * price.output;
  return Number((inCost + outCost).toFixed(6));
}

type ApiUsageEntry = {
  provider: ApiProvider;
  endpoint: string;
  userId?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  status?: "ok" | "error";
  latencyMs?: number | null;
};

/** Record one external-API call. Never throws. */
export async function logApiUsage(entry: ApiUsageEntry): Promise<void> {
  try {
    const row: TablesInsert<"api_usage_log"> = {
      provider: entry.provider,
      endpoint: entry.endpoint,
      user_id: entry.userId ?? null,
      model: entry.model ?? null,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      cost_usd: entry.costUsd ?? null,
      status: entry.status ?? "ok",
      latency_ms: entry.latencyMs ?? null,
    };
    await createAdminClient().from("api_usage_log").insert(row);
  } catch (err) {
    console.error("logApiUsage failed", err);
  }
}

type AdminActionEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
};

/** Record one admin mutation to the audit log. Never throws. */
export async function logAdminAction(entry: AdminActionEntry): Promise<void> {
  try {
    const row: TablesInsert<"admin_audit_log"> = {
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      detail: (entry.detail ?? null) as TablesInsert<"admin_audit_log">["detail"],
    };
    await createAdminClient().from("admin_audit_log").insert(row);
  } catch (err) {
    console.error("logAdminAction failed", err);
  }
}

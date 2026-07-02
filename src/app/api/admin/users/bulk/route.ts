import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/adminLog";
import { TablesUpdate } from "@/lib/supabase/database.types";

type BulkAction = "suspend" | "activate" | "set_tier";

/** Apply a bulk profile action to multiple users. Body: { ids, action, tier? } */
export async function POST(req: NextRequest) {
  const { error, status, user } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  const action = body.action as BulkAction;
  const tier = body.tier === "premium" ? "premium" : "free";

  if (ids.length === 0) return Response.json({ ok: false, error: "No users selected" }, { status: 400 });
  if (!["suspend", "activate", "set_tier"].includes(action)) {
    return Response.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  // Never let an admin suspend their own account in a bulk operation.
  const targetIds = action === "suspend" ? ids.filter((id) => id !== user!.id) : ids;

  const update: TablesUpdate<"profiles"> =
    action === "suspend" ? { status: "suspended" } : action === "activate" ? { status: "active" } : { tier };

  try {
    const admin = createAdminClient();
    const { error: updateError } = await admin.from("profiles").update(update).in("id", targetIds);
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });

    void logAdminAction({
      actorId: user?.id,
      actorEmail: user?.email ?? null,
      action: `user.bulk_${action}`,
      targetType: "user",
      detail: { ids: targetIds, ...update },
    });

    return Response.json({ ok: true, updated: targetIds.length });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Bulk update failed" }, { status: 500 });
  }
}

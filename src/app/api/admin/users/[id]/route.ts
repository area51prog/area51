import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { TablesUpdate } from "@/lib/supabase/database.types";
import { logAdminAction } from "@/lib/adminLog";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const { id } = await params;

  try {
    const admin = createAdminClient();

    const [
      { data: authUser },
      { data: profile },
      { count: portfolioCount },
      { count: watchlistCount },
      { count: holdingCount },
      { count: reportCount },
      { data: lastActivity },
    ] = await Promise.all([
      admin.auth.admin.getUserById(id),
      admin.from("profiles").select("role, tier, status, created_at").eq("id", id).maybeSingle(),
      admin.from("portfolios").select("id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("watchlists").select("id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("portfolio_holdings").select("id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("research_reports").select("symbol", { count: "exact", head: true }).eq("generated_by", id),
      admin.from("api_usage_log").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1),
    ]);

    return Response.json({
      ok: true,
      detail: {
        id,
        email: authUser?.user?.email ?? "",
        full_name: (authUser?.user?.user_metadata?.full_name as string | undefined) ?? "",
        created_at: authUser?.user?.created_at ?? null,
        last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
        role: profile?.role ?? "user",
        tier: profile?.tier ?? "free",
        status: profile?.status ?? "active",
        counts: {
          portfolios: portfolioCount ?? 0,
          watchlists: watchlistCount ?? 0,
          holdings: holdingCount ?? 0,
          reports: reportCount ?? 0,
        },
        lastApiActivity: lastActivity?.[0]?.created_at ?? null,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, status, user } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const { id } = await params;
  const body = await req.json();

  if (id === user!.id && body.role === "user") {
    return Response.json({ ok: false, error: "You can't remove your own administrator role" }, { status: 400 });
  }
  if (id === user!.id && body.status === "suspended") {
    return Response.json({ ok: false, error: "You can't suspend your own account" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const profileUpdate: TablesUpdate<"profiles"> = {};
    if (body.role === "administrator" || body.role === "user") profileUpdate.role = body.role;
    if (body.tier === "premium" || body.tier === "free") profileUpdate.tier = body.tier;
    if (body.status === "active" || body.status === "suspended") profileUpdate.status = body.status;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await admin.from("profiles").update(profileUpdate).eq("id", id);
      if (profileError) return Response.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    if (typeof body.full_name === "string" || body.notification_prefs !== undefined) {
      const userMetadata: Record<string, unknown> = {};
      if (typeof body.full_name === "string") userMetadata.full_name = body.full_name;
      if (body.notification_prefs !== undefined) userMetadata.notification_prefs = body.notification_prefs;

      const { error: metaError } = await admin.auth.admin.updateUserById(id, { user_metadata: userMetadata });
      if (metaError) return Response.json({ ok: false, error: metaError.message }, { status: 500 });
    }

    void logAdminAction({
      actorId: user?.id,
      actorEmail: user?.email ?? null,
      action: "user.update",
      targetType: "user",
      targetId: id,
      detail: {
        ...profileUpdate,
        ...(typeof body.full_name === "string" ? { full_name: body.full_name } : {}),
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, status, user } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const { id } = await params;
  if (id === user!.id) {
    return Response.json({ ok: false, error: "You can't delete your own account" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);
    if (deleteError) return Response.json({ ok: false, error: deleteError.message }, { status: 500 });

    void logAdminAction({
      actorId: user?.id,
      actorEmail: user?.email ?? null,
      action: "user.delete",
      targetType: "user",
      targetId: id,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Delete failed" }, { status: 500 });
  }
}

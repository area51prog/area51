import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { TablesUpdate } from "@/lib/supabase/database.types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, status, user } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  if (id === user!.id && body.role === "user") {
    return Response.json({ ok: false, error: "You can't remove your own administrator role" }, { status: 400 });
  }
  if (id === user!.id && body.status === "suspended") {
    return Response.json({ ok: false, error: "You can't suspend your own account" }, { status: 400 });
  }

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

  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, status, user } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const { id } = await params;
  if (id === user!.id) {
    return Response.json({ ok: false, error: "You can't delete your own account" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) return Response.json({ ok: false, error: deleteError.message }, { status: 500 });

  return Response.json({ ok: true });
}

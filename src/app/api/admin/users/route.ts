import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  try {
    const admin = createAdminClient();

    const [{ data: authUsers, error: authError }, { data: profiles, error: profilesError }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("profiles").select("id, role, tier, status, created_at"),
    ]);

    if (authError || profilesError) {
      return Response.json({ ok: false, error: authError?.message ?? profilesError?.message }, { status: 500 });
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users = authUsers.users.map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: (u.user_metadata?.full_name as string | undefined) ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        role: profile?.role ?? "user",
        tier: profile?.tier ?? "free",
        status: profile?.status ?? "active",
      };
    });

    return Response.json({ ok: true, users });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const body = await req.json();
  const email = (body.email as string | undefined)?.trim();
  const fullName = (body.full_name as string | undefined)?.trim() ?? "";
  const role = body.role === "administrator" ? "administrator" : "user";
  const tier = body.tier === "premium" ? "premium" : "free";

  if (!email) {
    return Response.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });

    if (inviteError || !invited.user) {
      return Response.json({ ok: false, error: inviteError?.message ?? "Invite failed" }, { status: 500 });
    }

    if (role !== "user" || tier !== "free") {
      const { error: profileError } = await admin
        .from("profiles")
        .update({ role, tier })
        .eq("id", invited.user.id);
      if (profileError) {
        return Response.json({ ok: false, error: profileError.message }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to invite user" }, { status: 500 });
  }
}

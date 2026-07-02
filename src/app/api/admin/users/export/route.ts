import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

function csvCell(value: string | null): string {
  const v = value ?? "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Export all users as a CSV download. */
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
    const header = ["email", "full_name", "role", "tier", "status", "created_at", "last_sign_in_at"];
    const lines = [header.join(",")];
    for (const u of authUsers.users) {
      const p = profileById.get(u.id);
      lines.push(
        [
          csvCell(u.email ?? ""),
          csvCell((u.user_metadata?.full_name as string | undefined) ?? ""),
          csvCell(p?.role ?? "user"),
          csvCell(p?.tier ?? "free"),
          csvCell(p?.status ?? "active"),
          csvCell(u.created_at ?? ""),
          csvCell(u.last_sign_in_at ?? ""),
        ].join(","),
      );
    }

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Export failed" }, { status: 500 });
  }
}

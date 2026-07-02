import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/adminLog";

const PAGE_SIZE = 25;
const SORT_FIELDS = ["created_at", "last_sign_in_at", "email", "role", "tier", "status"] as const;
type SortField = (typeof SORT_FIELDS)[number];

/** List users with search, filter, sort, and pagination. Query: ?search=&role=&tier=&status=&sort=&page= */
export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const params = req.nextUrl.searchParams;
  const search = (params.get("search") ?? "").trim().toLowerCase();
  const roleFilter = params.get("role");
  const tierFilter = params.get("tier");
  const statusFilter = params.get("status");
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const [sortRaw, dirRaw] = (params.get("sort") ?? "created_at:desc").split(":");
  const sortField: SortField = SORT_FIELDS.includes(sortRaw as SortField) ? (sortRaw as SortField) : "created_at";
  const dir = dirRaw === "asc" ? 1 : -1;

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

    let users = authUsers.users.map((u) => {
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

    if (search) {
      users = users.filter((u) => u.email.toLowerCase().includes(search) || u.full_name.toLowerCase().includes(search));
    }
    if (roleFilter) users = users.filter((u) => u.role === roleFilter);
    if (tierFilter) users = users.filter((u) => u.tier === tierFilter);
    if (statusFilter) users = users.filter((u) => u.status === statusFilter);

    users.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });

    const total = users.length;
    const start = (page - 1) * PAGE_SIZE;
    const paged = users.slice(start, start + PAGE_SIZE);

    return Response.json({ ok: true, users: paged, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, status, user: actor } = await requireAdmin();
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

    void logAdminAction({
      actorId: actor?.id,
      actorEmail: actor?.email ?? null,
      action: "user.invite",
      targetType: "user",
      targetId: invited.user.id,
      detail: { email, full_name: fullName, role, tier },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to invite user" }, { status: 500 });
  }
}

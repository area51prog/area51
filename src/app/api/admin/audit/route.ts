import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 50;

/** Paginated admin audit-log feed. Query: ?page= */
export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) return Response.json({ ok: false, error }, { status });

  const page = Math.max(Number(req.nextUrl.searchParams.get("page")) || 1, 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const admin = createAdminClient();
    const { data, count, error: queryError } = await admin
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (queryError) return Response.json({ ok: false, error: queryError.message }, { status: 500 });

    return Response.json({ ok: true, entries: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to load audit log" }, { status: 500 });
  }
}

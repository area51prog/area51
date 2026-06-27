import { createClient } from "./server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return { error: "Not signed in" as const, status: 401 as const, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "administrator") {
    return { error: "Forbidden" as const, status: 403 as const, user: null };
  }

  return { error: null, status: 200 as const, user };
}

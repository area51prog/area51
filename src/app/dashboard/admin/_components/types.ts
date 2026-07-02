export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "user" | "administrator";
  tier: "free" | "premium";
  status: "active" | "suspended";
}

export interface AdminUserDetail extends AdminUser {
  counts: { portfolios: number; watchlists: number; holdings: number; reports: number };
  lastApiActivity: string | null;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Trash2, Pencil, X, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/useProfile";
import { Card } from "@/components/ui";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "user" | "administrator";
  tier: "free" | "premium";
  status: "active" | "suspended";
}

export default function AdminConsolePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, ready } = useProfile();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/dashboard");
  }, [ready, isAdmin, router]);

  async function loadUsers() {
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load users");
        return;
      }
      setUsers(json.users);
    } catch {
      setError("Failed to load users — the server returned an unexpected response. Check that SUPABASE_SERVICE_ROLE_KEY is set.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the initial fetch once we know the user is an admin
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? "Delete failed");
      return;
    }
    setUsers((prev) => prev?.filter((u) => u.id !== id) ?? null);
  }

  if (!ready || !isAdmin) return null;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-brand" />
          <h2 className="text-lg font-semibold text-heading">Admin Console</h2>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand text-white text-sm font-semibold px-3.5 py-2 hover:bg-brand/90"
        >
          <UserPlus size={16} /> Invite user
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-down/30 bg-down/5 text-down text-sm px-4 py-3">{error}</div>
      )}

      {showInvite && (
        <InviteForm
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            loadUsers();
          }}
        />
      )}

      <Card>
        {!users ? (
          <p className="text-sm text-foreground/50">Loading users…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-foreground/50 border-b border-line">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  isSelf={u.id === user?.id}
                  editing={editingId === u.id}
                  onEdit={() => setEditingId(u.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaved={(updated) => {
                    setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, ...updated } : x)) ?? null);
                    setEditingId(null);
                  }}
                  onDelete={() => handleDelete(u.id, u.email)}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Badge({ tone, children }: { tone: "brand" | "amber" | "up" | "down" | "neutral"; children: React.ReactNode }) {
  const toneClasses: Record<typeof tone, string> = {
    brand: "bg-brand-light text-brand",
    amber: "bg-amber-400/15 text-amber-500",
    up: "bg-up/10 text-up",
    down: "bg-down/10 text-down",
    neutral: "bg-background text-foreground/50",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function UserRow({
  u,
  isSelf,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onError,
}: {
  u: AdminUser;
  isSelf: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (updated: Partial<AdminUser>) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [role, setRole] = useState(u.role);
  const [tier, setTier] = useState(u.tier);
  const [status, setStatus] = useState(u.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, tier, status }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.ok) {
      onError(json.error ?? "Update failed");
      return;
    }
    onSaved({ role, tier, status });
  }

  if (editing) {
    return (
      <tr className="border-b border-line last:border-0">
        <td className="py-2.5 pr-3">
          <div className="font-medium text-heading">{u.full_name || "—"}</div>
          <div className="text-xs text-foreground/50">{u.email}</div>
        </td>
        <td className="py-2.5 pr-3">
          <select
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as AdminUser["role"])}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs"
          >
            <option value="user">User</option>
            <option value="administrator">Administrator</option>
          </select>
        </td>
        <td className="py-2.5 pr-3">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as AdminUser["tier"])}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs"
          >
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </td>
        <td className="py-2.5 pr-3">
          <select
            value={status}
            disabled={isSelf}
            onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </td>
        <td className="py-2.5 pr-3 text-xs text-foreground/50">{new Date(u.created_at).toLocaleDateString()}</td>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-brand text-white text-xs font-semibold px-2.5 py-1.5 hover:bg-brand/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={onCancelEdit} className="text-foreground/50 hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2.5 pr-3">
        <div className="font-medium text-heading">
          {u.full_name || "—"} {isSelf && <span className="text-xs text-foreground/40">(you)</span>}
        </div>
        <div className="text-xs text-foreground/50">{u.email}</div>
      </td>
      <td className="py-2.5 pr-3">
        <Badge tone={u.role === "administrator" ? "brand" : "neutral"}>{u.role === "administrator" ? "Admin" : "User"}</Badge>
      </td>
      <td className="py-2.5 pr-3">
        <Badge tone={u.tier === "premium" ? "amber" : "neutral"}>{u.tier}</Badge>
      </td>
      <td className="py-2.5 pr-3">
        <Badge tone={u.status === "active" ? "up" : "down"}>{u.status}</Badge>
      </td>
      <td className="py-2.5 pr-3 text-xs text-foreground/50">{new Date(u.created_at).toLocaleDateString()}</td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="text-foreground/50 hover:text-brand" title="Edit">
            <Pencil size={16} />
          </button>
          {!isSelf && (
            <button onClick={onDelete} className="text-foreground/50 hover:text-down" title="Delete">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function InviteForm({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"user" | "administrator">("user");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: fullName, role, tier }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!json.ok) {
      setError(json.error ?? "Invite failed");
      return;
    }
    onInvited();
  }

  return (
    <Card title="Invite a new user" action={<button onClick={onClose} className="text-foreground/50 hover:text-foreground"><X size={16} /></button>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm"
            >
              <option value="user">User</option>
              <option value="administrator">Administrator</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Tier</span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as typeof tier)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
          {error && <span className="text-sm text-down">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

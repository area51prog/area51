"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Pencil, X, UserPlus, Download, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui";
import { Badge } from "../_components/Badge";
import { InviteForm } from "../_components/InviteForm";
import { UserDetailDrawer } from "../_components/UserDetailDrawer";
import type { AdminUser } from "../_components/types";

type SortField = "created_at" | "last_sign_in_at" | "email" | "role" | "tier" | "status";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Query state
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortField>("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const pageSize = 25;
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  const loadUsers = useCallback(async () => {
    setError("");
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (role) qs.set("role", role);
    if (tier) qs.set("tier", tier);
    if (status) qs.set("status", status);
    qs.set("sort", `${sort}:${dir}`);
    qs.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load users");
        return;
      }
      setUsers(json.users);
      setTotal(json.total ?? json.users.length);
    } catch {
      setError("Failed to load users — check that SUPABASE_SERVICE_ROLE_KEY is set.");
    }
  }, [search, role, tier, status, sort, dir, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on query-state change
    loadUsers();
  }, [loadUsers]);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination when filters change
    setPage(1);
  }, [search, role, tier, status]);

  function toggleSort(field: SortField) {
    if (sort === field) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setDir("asc");
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) return setError(json.error ?? "Delete failed");
    loadUsers();
  }

  async function runBulk(action: "suspend" | "activate" | "set_tier", bulkTier?: "free" | "premium") {
    if (selected.size === 0) return;
    const res = await fetch("/api/admin/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action, tier: bulkTier }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.error ?? "Bulk action failed");
    setSelected(new Set());
    loadUsers();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Search email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-48 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <FilterSelect value={role} onChange={setRole} label="Role" options={[["user", "User"], ["administrator", "Admin"]]} />
        <FilterSelect value={tier} onChange={setTier} label="Tier" options={[["free", "Free"], ["premium", "Premium"]]} />
        <FilterSelect
          value={status}
          onChange={setStatus}
          label="Status"
          options={[["active", "Active"], ["suspended", "Suspended"]]}
        />
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route file download, not a page */}
        <a
          href="/api/admin/users/export"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-foreground/70 hover:text-foreground"
        >
          <Download size={15} /> Export
        </a>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand/90"
        >
          <UserPlus size={16} /> Invite
        </button>
      </div>

      {error && <div className="rounded-lg border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">{error}</div>}

      {showInvite && (
        <InviteForm
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            loadUsers();
          }}
        />
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-4 py-2.5 text-sm">
          <span className="font-semibold text-brand">{selected.size} selected</span>
          <button onClick={() => runBulk("suspend")} className="rounded-md bg-surface px-2.5 py-1 font-semibold hover:bg-background">
            Suspend
          </button>
          <button onClick={() => runBulk("activate")} className="rounded-md bg-surface px-2.5 py-1 font-semibold hover:bg-background">
            Activate
          </button>
          <button onClick={() => runBulk("set_tier", "premium")} className="rounded-md bg-surface px-2.5 py-1 font-semibold hover:bg-background">
            Set premium
          </button>
          <button onClick={() => runBulk("set_tier", "free")} className="rounded-md bg-surface px-2.5 py-1 font-semibold hover:bg-background">
            Set free
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-foreground/50 hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      )}

      <Card>
        {!users ? (
          <p className="text-sm text-foreground/50">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-foreground/50">No users match these filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-foreground/50">
                <th className="w-8 py-2" />
                <SortHeader label="User" field="email" sort={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Role" field="role" sort={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Tier" field="tier" sort={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Status" field="status" sort={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Joined" field="created_at" sort={sort} dir={dir} onSort={toggleSort} />
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
                  selected={selected.has(u.id)}
                  onToggleSelect={() => toggleSelect(u.id)}
                  onOpenDetail={() => setDetailId(u.id)}
                  onEdit={() => setEditingId(u.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    loadUsers();
                  }}
                  onDelete={() => handleDelete(u.id, u.email)}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        )}

        {total > pageSize && (
          <div className="mt-4 flex items-center justify-between text-sm text-foreground/60">
            <span>
              {total} users · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-line px-3 py-1 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-line px-3 py-1 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {detailId && <UserDetailDrawer userId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
    >
      <option value="">{label}: all</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function SortHeader({
  label,
  field,
  sort,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: SortField;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
}) {
  return (
    <th className="py-2 pr-3">
      <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown size={11} className={sort === field ? "text-brand" : "opacity-40"} />
        {sort === field && <span className="text-brand">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function UserRow({
  u,
  isSelf,
  editing,
  selected,
  onToggleSelect,
  onOpenDetail,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
  onError,
}: {
  u: AdminUser;
  isSelf: boolean;
  editing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
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
    if (!json.ok) return onError(json.error ?? "Update failed");
    onSaved();
  }

  if (editing) {
    return (
      <tr className="border-b border-line last:border-0">
        <td />
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
              className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
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
      <td className="py-2.5">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="accent-brand" />
      </td>
      <td className="py-2.5 pr-3">
        <button onClick={onOpenDetail} className="text-left hover:text-brand">
          <div className="font-medium text-heading">
            {u.full_name || "—"} {isSelf && <span className="text-xs text-foreground/40">(you)</span>}
          </div>
          <div className="text-xs text-foreground/50">{u.email}</div>
        </button>
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

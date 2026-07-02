"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui";

export function InviteForm({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
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
    <Card
      title="Invite a new user"
      action={
        <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
          <X size={16} />
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground/70">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground/70">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground/70">Role</span>
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
            <span className="mb-1.5 block text-xs font-semibold text-foreground/70">Tier</span>
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
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
          {error && <span className="text-sm text-down">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

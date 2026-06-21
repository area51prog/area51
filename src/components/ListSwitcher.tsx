"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useProfile } from "@/lib/useProfile";

export interface ListOption {
  id: string;
  name: string;
}

export function ListSwitcher({
  lists,
  activeId,
  onSwitch,
  onCreate,
  noun,
}: {
  lists: ListOption[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => Promise<{ error?: string }>;
  noun: string;
}) {
  const { maxLists } = useProfile();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const atLimit = lists.length >= maxLists;
  const active = lists.find((l) => l.id === activeId);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error: createError } = await onCreate(trimmed);
    if (createError) {
      setError(
        createError.includes("list_limit_exceeded")
          ? `Your plan allows up to ${maxLists} ${noun}${maxLists === 1 ? "" : "s"}. Upgrade to Premium for more.`
          : createError
      );
      return;
    }
    setName("");
    setCreating(false);
    setError("");
    setOpen(false);
  }

  if (lists.length <= 1 && !creating) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-heading">{active?.name ?? `My ${noun}`}</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={atLimit}
          title={atLimit ? `Upgrade to Premium for more ${noun}s` : `New ${noun}`}
          className="text-foreground/40 hover:text-brand disabled:opacity-40 disabled:hover:text-foreground/40"
        >
          <Plus size={15} />
        </button>
        {creating && (
          <NewListForm noun={noun} name={name} setName={setName} error={error} onCreate={handleCreate} onCancel={() => setCreating(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-heading rounded-lg border border-line px-3 py-1.5 hover:bg-background"
      >
        {active?.name ?? `My ${noun}`}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-56 rounded-lg border border-line bg-surface shadow-lg p-1.5">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                onSwitch(l.id);
                setOpen(false);
              }}
              className={`w-full text-left text-sm rounded-md px-2.5 py-1.5 ${
                l.id === activeId ? "bg-brand-light text-brand" : "hover:bg-background"
              }`}
            >
              {l.name}
            </button>
          ))}
          <div className="border-t border-line mt-1.5 pt-1.5">
            {creating ? (
              <NewListForm noun={noun} name={name} setName={setName} error={error} onCreate={handleCreate} onCancel={() => setCreating(false)} />
            ) : (
              <button
                onClick={() => setCreating(true)}
                disabled={atLimit}
                className="w-full flex items-center gap-1.5 text-sm text-foreground/60 hover:text-brand px-2.5 py-1.5 disabled:opacity-40 disabled:hover:text-foreground/60"
              >
                <Plus size={14} /> New {noun}
              </button>
            )}
            {atLimit && !creating && (
              <p className="text-xs text-foreground/40 px-2.5 pt-1">Upgrade to Premium for more {noun}s.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NewListForm({
  noun,
  name,
  setName,
  error,
  onCreate,
  onCancel,
}: {
  noun: string;
  name: string;
  setName: (v: string) => void;
  error: string;
  onCreate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-2.5 py-1.5 space-y-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`New ${noun} name`}
        onKeyDown={(e) => e.key === "Enter" && onCreate()}
        className="w-full rounded-md border border-line bg-background text-foreground px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
      />
      {error && <p className="text-xs text-down">{error}</p>}
      <div className="flex gap-1.5">
        <button onClick={onCreate} className="text-xs font-semibold text-brand">
          Create
        </button>
        <button onClick={onCancel} className="text-xs text-foreground/50">
          Cancel
        </button>
      </div>
    </div>
  );
}

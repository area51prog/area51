"use client";

import { useState } from "react";
import { ChevronDown, Plus, MoreVertical } from "lucide-react";
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
  onRename,
  onDelete,
  noun,
}: {
  lists: ListOption[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => Promise<{ error?: string }>;
  onRename?: (id: string, name: string) => Promise<{ error?: string }>;
  onDelete?: (id: string) => Promise<{ error?: string }>;
  noun: string;
}) {
  const { maxLists } = useProfile();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const atLimit = lists.length >= maxLists;
  const active = lists.find((l) => l.id === activeId);

  function startEdit(list: ListOption) {
    setMenuForId(null);
    setConfirmDeleteId(null);
    setEditingId(list.id);
    setEditName(list.name);
    setEditError("");
  }

  async function commitEdit() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const { error: renameError } = await onRename!(editingId, trimmed);
    if (renameError) {
      setEditError(renameError);
      return;
    }
    setEditingId(null);
    setEditError("");
  }

  async function handleDelete(id: string) {
    const { error: deleteErr } = await onDelete!(id);
    if (deleteErr) {
      setDeleteError(deleteErr);
      return;
    }
    setConfirmDeleteId(null);
    setMenuForId(null);
    setDeleteError("");
  }

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

  if (lists.length <= 1) {
    const isEditing = editingId === active?.id && active;
    return (
      <div className="flex items-center gap-2 relative">
        {isEditing ? (
          <RenameInput
            value={editName}
            onChange={setEditName}
            onCommit={commitEdit}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <span className="text-sm font-semibold text-heading">{active?.name ?? `My ${noun}`}</span>
        )}
        {editError && !isEditing && <p className="text-xs text-down">{editError}</p>}
        {onRename && active && !isEditing && (
          <button
            type="button"
            onClick={() => setMenuForId((id) => (id === active.id ? null : active.id))}
            className="text-foreground/40 hover:text-brand"
            title={`Rename ${noun}`}
          >
            <MoreVertical size={14} />
          </button>
        )}
        {menuForId === active?.id && active && (
          <div className="absolute z-10 top-full mt-1 left-0 w-32 rounded-lg border border-line bg-surface shadow-lg p-1">
            <button
              onClick={() => startEdit(active)}
              className="w-full text-left text-sm rounded-md px-2.5 py-1.5 hover:bg-background"
            >
              Rename
            </button>
          </div>
        )}
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
        <div className="absolute z-10 mt-1 w-64 rounded-lg border border-line bg-surface shadow-lg p-1.5">
          {lists.map((l) => {
            const isEditing = editingId === l.id;
            const isConfirming = confirmDeleteId === l.id;
            return (
              <div key={l.id} className="group relative">
                {isEditing ? (
                  <div className="px-2.5 py-1.5">
                    <RenameInput
                      value={editName}
                      onChange={setEditName}
                      onCommit={commitEdit}
                      onCancel={() => setEditingId(null)}
                    />
                    {editError && <p className="text-xs text-down mt-1">{editError}</p>}
                  </div>
                ) : isConfirming ? (
                  <div className="px-2.5 py-1.5 space-y-1.5">
                    <p className="text-xs text-foreground/70">Delete &ldquo;{l.name}&rdquo;?</p>
                    {deleteError && <p className="text-xs text-down">{deleteError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(l.id)} className="text-xs font-semibold text-down">
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setDeleteError("");
                        }}
                        className="text-xs text-foreground/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        onSwitch(l.id);
                        setOpen(false);
                      }}
                      className={`flex-1 text-left text-sm rounded-md px-2.5 py-1.5 ${
                        l.id === activeId ? "bg-brand-light text-brand" : "hover:bg-background"
                      }`}
                    >
                      {l.name}
                    </button>
                    {(onRename || onDelete) && (
                      <button
                        type="button"
                        onClick={() => setMenuForId((id) => (id === l.id ? null : l.id))}
                        className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-brand px-1.5"
                        title={`${noun} options`}
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </div>
                )}
                {menuForId === l.id && !isEditing && !isConfirming && (
                  <div className="absolute z-20 right-0 top-full mt-0.5 w-32 rounded-lg border border-line bg-surface shadow-lg p-1">
                    {onRename && (
                      <button
                        onClick={() => startEdit(l)}
                        className="w-full text-left text-sm rounded-md px-2.5 py-1.5 hover:bg-background"
                      >
                        Rename
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (lists.length <= 1) return;
                          setMenuForId(null);
                          setConfirmDeleteId(l.id);
                          setDeleteError("");
                        }}
                        disabled={lists.length <= 1}
                        title={lists.length <= 1 ? "Keep at least one list" : undefined}
                        className="w-full text-left text-sm rounded-md px-2.5 py-1.5 text-down hover:bg-background disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

function RenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCancel();
      }}
      className="rounded-md border border-line bg-background text-foreground px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
    />
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

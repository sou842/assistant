"use client";

import React, { useEffect, useState } from "react";
import {
  Database,
  Search,
  Plus,
  FileText,
  Table2,
  Trash2,
  ChevronDown,
  Image as ImageIcon,
  Pencil,
  CheckCircle2,
  Circle,
  NotebookPen,
  LayoutGrid,
  List,
  Ellipsis,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "../_components/page-header";
import { useAI } from "../_components/ai-provider";

type VaultItemType = "note" | "spreadsheet" | "gallery" | "album";
type FilterType = "all" | VaultItemType;
type ViewMode = "card" | "list";

interface VaultItem {
  _id: string;
  title: string;
  type: VaultItemType;
  createdAt: string;
  tags?: string[];
}

const ITEM_TYPE_META: Record<
  VaultItemType,
  { label: string; icon: LucideIcon; bgClass: string }
> = {
  note: { label: "Note", icon: FileText, bgClass: "bg-blue-500" },
  spreadsheet: { label: "Spreadsheet", icon: Table2, bgClass: "bg-emerald-500" },
  album: { label: "Album", icon: NotebookPen, bgClass: "bg-amber-600" },
  gallery: { label: "Media Gallery", icon: ImageIcon, bgClass: "bg-cyan-600" },
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "note", label: "Notes" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "gallery", label: "Media Galleries" },
  { value: "album", label: "Albums" },
];

const CREATE_OPTIONS: { type: VaultItemType; label: string; iconClass: string }[] = [
  { type: "note", label: "New Note", iconClass: "text-blue-400" },
  { type: "spreadsheet", label: "New Spreadsheet", iconClass: "text-green-400" },
  { type: "album", label: "New Album", iconClass: "text-pink-400" },
];

const VIEW_MODE_STORAGE_KEY = "vault-view-mode";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function ItemIcon({ type, size = 22 }: { type: VaultItemType; size?: number }) {
  const meta = ITEM_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div className={cn("shrink-0 rounded-full p-2.5", meta.bgClass)}>
      <Icon size={size} className="text-gray-50" />
    </div>
  );
}

function TagList({ tags, max, className }: { tags: string[]; max: number; className?: string }) {
  if (!tags || tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const overflow = tags.length - max;

  return (
    <div className={className}>
      {visible.map((tag, i) => (
        <span
          key={i}
          className="rounded-full border border-app-border-subtle bg-app-surface-glass px-2 py-0.5 text-[10px] text-app-text-soft"
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full border border-app-border-subtle bg-app-surface-glass px-2 py-0.5 text-[10px] text-app-text-soft">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function RenameField({
  value,
  onChange,
  onSubmit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent | React.FocusEvent) => void;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={className} onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-full bg-app-surface-glass px-2 py-1 text-sm font-semibold text-app-text-primary outline-none"
      />
    </form>
  );
}

function ItemActionsMenu({
  isSelected,
  onEdit,
  onToggleSelect,
  onDelete,
  triggerSize = 20,
}: {
  isSelected: boolean;
  onEdit: () => void;
  onToggleSelect: () => void;
  onDelete: () => void;
  triggerSize?: number;
}) {
  // Closes the dropdown by removing focus, then runs the given handler.
  const runAndClose = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    fn();
  };

  return (
    <div className="dropdown dropdown-end" onClick={(e) => e.stopPropagation()}>
      {isSelected ? (
        <CheckCircle2 size={triggerSize} className="shrink-0 text-brand-primary" />
      ) : (
        <button
          type="button"
          tabIndex={0}
          aria-label="Item actions"
          className="cursor-pointer rounded-full p-1.5 text-app-text-ghost transition-all hover:bg-app-surface-glass-strong hover:text-app-text-primary"
        >
          <Ellipsis size={triggerSize} />
        </button>
      )}
      <ul
        tabIndex={0}
        className="dropdown-content menu z-50 mt-1 w-36 rounded-xl border border-app-border-default bg-app-surface-elevated p-1 shadow-2xl"
      >
        <li>
          <button
            type="button"
            onClick={runAndClose(onEdit)}
            className="flex items-center gap-2 py-2 text-xs text-app-text-primary hover:bg-app-surface-glass"
          >
            <Pencil size={14} className="text-zinc-400" />
            Edit
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={runAndClose(onToggleSelect)}
            className="flex items-center gap-2 py-2 text-xs text-app-text-primary hover:bg-app-surface-glass"
          >
            {isSelected ? (
              <CheckCircle2 size={14} className="text-brand-primary" />
            ) : (
              <Circle size={14} className="text-zinc-400" />
            )}
            {isSelected ? "Deselect" : "Select"}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={runAndClose(onDelete)}
            className="flex items-center gap-2 py-2 text-xs text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </li>
      </ul>
    </div>
  );
}

interface ItemRowProps {
  item: VaultItem;
  isSelected: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (v: string) => void;
  onRenameSubmit: (e: React.FormEvent | React.FocusEvent) => void;
  onOpen: () => void;
  onStartRename: () => void;
  onToggleSelect: () => void;
  onDelete: () => void;
}

function VaultCard({
  item,
  isSelected,
  isEditing,
  editTitle,
  onEditTitleChange,
  onRenameSubmit,
  onOpen,
  onStartRename,
  onToggleSelect,
  onDelete,
}: ItemRowProps) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-app-surface-glass-soft p-5 transition-all hover:bg-app-surface-glass",
        isSelected ? "bg-app-primary/5" : "border-app-border-subtle"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <ItemIcon type={item.type} />
        <ItemActionsMenu
          isSelected={isSelected}
          onEdit={onStartRename}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
        />
      </div>

      {isEditing ? (
        <RenameField
          value={editTitle}
          onChange={onEditTitleChange}
          onSubmit={onRenameSubmit}
          className="mb-1"
        />
      ) : (
        <h3 className="mb-1 truncate font-semibold text-app-text-primary">{item.title}</h3>
      )}

      <div className="mb-4 flex items-center gap-2 text-xs text-app-text-faint">
        <span className="capitalize">{item.type}</span>
        <span>•</span>
        <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
      </div>

      <TagList
        tags={item.tags ?? []}
        max={3}
        className="mt-auto flex flex-wrap gap-1 border-t border-app-border-subtle pt-4"
      />
    </div>
  );
}

function VaultListRow({
  item,
  isSelected,
  isEditing,
  editTitle,
  onEditTitleChange,
  onRenameSubmit,
  onOpen,
  onStartRename,
  onToggleSelect,
  onDelete,
}: ItemRowProps) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "grid cursor-pointer grid-cols-12 items-center gap-4 px-6 py-3 text-sm transition-all hover:bg-app-surface-glass",
        isSelected ? "bg-app-primary/5" : ""
      )}
    >
      <div className="col-span-6 flex min-w-0 items-center gap-3">
        {isSelected && <CheckCircle2 size={16} className="shrink-0 text-brand-primary" />}
        <ItemIcon type={item.type} size={16} />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <RenameField
              value={editTitle}
              onChange={onEditTitleChange}
              onSubmit={onRenameSubmit}
              className="my-0.5"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-app-text-primary">{item.title}</span>
              <TagList tags={item.tags ?? []} max={2} className="hidden shrink-0 gap-1 md:flex" />
            </div>
          )}
        </div>
      </div>

      <div className="col-span-2 text-xs capitalize text-app-text-soft">{item.type}</div>

      <div className="col-span-2 text-xs text-app-text-soft">
        {format(new Date(item.createdAt), "MMM d, yyyy")}
      </div>

      <div className="col-span-2 flex items-center justify-end gap-1">
        <ItemActionsMenu
          isSelected={false}
          onEdit={onStartRename}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          triggerSize={18}
        />
      </div>
    </div>
  );
}

export default function VaultPage() {
  const router = useRouter();
  const { setMobileSidebarOpen } = useAI();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === "card" || saved === "list") setViewMode(saved);
  }, []);

  const setPersistedViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  };

  const searchParams = new URLSearchParams({
    search: debouncedQuery,
    type: filterType === "all" ? "" : filterType,
  });
  const { data, error, isLoading, mutate } = useSWR(`/api/vault?${searchParams}`, fetcher);
  const items: VaultItem[] = data?.items ?? [];

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async (type: VaultItemType) => {
    const title =
      type === "note" ? "New Note" : type === "album" ? "New Album" : type === "spreadsheet" ? "New Spreadsheet" : "New Item";
    const content = type === "spreadsheet" || type === "album" ? [] : {};

    const promise = fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, content }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Failed to create");
      const created = await res.json();
      router.push(`/ai/vault/${created.item._id}?edit=true`);
      return created;
    });

    toast.promise(promise, { loading: "Creating...", error: "Failed to create item" });
  };

  const handleOpen = (item: VaultItem) => {
    if (selectedIds.length > 0) {
      toggleSelected(item._id);
    } else {
      router.push(`/ai/vault/${item._id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success("Item deleted");
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      mutate();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) return;

    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => fetch(`/api/vault/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} item(s)`);
      } else {
        toast.success(`${selectedIds.length} item(s) deleted`);
      }
      setSelectedIds([]);
      mutate();
    } catch {
      toast.error("Failed to delete some items");
    }
  };

  const handleRenameSubmit = async (
    e: React.FormEvent | React.FocusEvent,
    id: string,
    originalTitle: string
  ) => {
    e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === originalTitle) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to rename item");
      toast.success("Item renamed");
      setEditingId(null);
      mutate();
    } catch {
      toast.error("Failed to rename item");
    }
  };

  const startRename = (item: VaultItem) => {
    setEditingId(item._id);
    setEditTitle(item.title);
  };

  const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === filterType)?.label ?? "All Types";

  const rowProps = (item: VaultItem): ItemRowProps => ({
    item,
    isSelected: selectedIds.includes(item._id),
    isEditing: editingId === item._id,
    editTitle,
    onEditTitleChange: setEditTitle,
    onRenameSubmit: (e) => handleRenameSubmit(e, item._id, item.title),
    onOpen: () => handleOpen(item),
    onStartRename: () => startRename(item),
    onToggleSelect: () => toggleSelected(item._id),
    onDelete: () => handleDelete(item._id),
  });

  return (
    <div className="flex h-full flex-col">
      {/* HEADER */}
      <PageHeader icon={<Database />} title="Vault" subtitle="Manage your stored data and documents">
        <div className="flex w-full items-center justify-end gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-red-400 px-4 text-xs font-semibold text-white transition-all hover:opacity-80"
            >
              <Trash2 size={14} />
              Delete {selectedIds.length} Selected
            </button>
          )}

          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-app-text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vault..."
              className="h-9 w-full rounded-full border border-app-border-default bg-app-surface-glass pl-9 pr-4 text-xs text-app-text-primary outline-none transition-all placeholder:text-app-text-faint focus:border-app-border-strong"
            />
          </div>

          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-app-border-default bg-app-surface-glass px-4 text-xs text-app-text-soft transition-all hover:text-app-text-primary"
            >
              {activeFilterLabel}
              <ChevronDown size={14} className="opacity-40" />
            </button>
            <ul tabIndex={0} className="dropdown-content menu z-[1] mt-2 w-48 rounded-xl border border-app-border-default bg-app-surface-elevated p-2 shadow-2xl">
              {FILTER_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => setFilterType(option.value)}
                    className={cn(
                      "py-2 text-xs",
                      filterType === option.value
                        ? "bg-app-surface-glass-strong text-app-text-primary"
                        : "text-app-text-faint hover:bg-app-surface-glass"
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-app-border-default bg-app-surface-glass p-0.5">
            {(
              [
                { mode: "card" as const, icon: LayoutGrid, label: "Grid View" },
                { mode: "list" as const, icon: List, label: "List View" },
              ]
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPersistedViewMode(mode)}
                title={label}
                aria-label={label}
                className={cn(
                  "cursor-pointer rounded-full p-1.5 transition-all",
                  viewMode === mode
                    ? "bg-app-surface-glass-strong text-app-text-primary"
                    : "text-app-text-ghost hover:text-app-text-primary"
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-8xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="size-8 animate-spin rounded-full border-2 border-app-border-default border-t-app-text-primary" />
            </div>
          ) : error ? (
            <div className="py-20 text-center text-app-danger-strong">Failed to load vault items.</div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-app-border-default bg-app-canvas px-6 text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-3xl border border-app-border-default bg-app-surface-glass-soft">
                <Database className="size-7 text-app-text-ghost" />
              </div>
              <h2 className="text-xl font-semibold">Vault is empty</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-app-text-faint">
                Create a note or spreadsheet, or ask Jarvis to save data for you.
              </p>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <VaultCard key={item._id} {...rowProps(item)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-2xl border border-app-border-subtle bg-app-surface-glass-soft">
              <div className="grid grid-cols-12 gap-4 border-b border-app-border-subtle bg-app-surface-glass/40 px-6 py-3 text-xs font-semibold text-app-text-faint">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Date Created</div>
                <div className="col-span-2 flex justify-end">Actions</div>
              </div>
              <div className="flex flex-col divide-y divide-app-border-subtle/40">
                {items.map((item) => (
                  <VaultListRow key={item._id} {...rowProps(item)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING NEW ITEM BUTTON */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="dropdown dropdown-top dropdown-end">
          <button
            type="button"
            tabIndex={0}
            aria-label="Create new item"
            className="group flex size-14 cursor-pointer items-center justify-center rounded-full bg-app-primary text-app-primary-foreground shadow-2xl transition-all hover:scale-110 hover:bg-app-primary-hover active:scale-95"
          >
            <Plus size={24} className="transition-transform duration-300 group-hover:rotate-90" />
          </button>
          <ul tabIndex={0} className="dropdown-content menu z-[1] mb-4 w-48 rounded-xl border border-app-border-default bg-app-surface-elevated p-2 shadow-2xl">
            {CREATE_OPTIONS.map(({ type, label, iconClass }) => {
              const Icon = ITEM_TYPE_META[type].icon;
              return (
                <li key={type}>
                  <button
                    type="button"
                    onClick={() => handleCreate(type)}
                    className="flex items-center gap-3 py-3 text-sm text-app-text-primary transition hover:bg-app-surface-glass"
                  >
                    <Icon size={18} className={iconClass} />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
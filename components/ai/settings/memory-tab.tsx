"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  Search,
  Plus,
  X,
  Tag,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAI } from "@/app/ai/_components/ai-provider";
import {
  createMemoryItem,
  saveStoredMemory,
  deleteStoredMemory,
  memoryCategories,
  parseMemoryTags,
  type MemoryCategory,
  type MemoryItem,
} from "@/lib/memory-storage";
import { formatDistanceToNow, format } from "date-fns";

const emptyForm = {
  title: "",
  content: "",
  category: "fact" as MemoryCategory,
  tags: "",
  enabled: true,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fact: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  preference: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  instruction: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  context: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
};

export function MemoryTab() {
  const { memories, setMemories, isSyncing } = useAI();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter memories
  const filteredMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return memories.filter((memory) => {
      const matchesCategory =
        categoryFilter === "all" || memory.category === categoryFilter;

      const searchable = `${memory.title || ""} ${memory.content || ""} ${(
        memory.tags || []
      ).join(" ")}`.toLowerCase();

      return (
        matchesCategory &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [memories, query, categoryFilter]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenDrawer(false);
  };

  const submitMemory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = form.content.trim();
    if (!content) {
      toast.error("Please add content for Jarvis to remember.");
      return;
    }

    if (editingId) {
      const updatedMemory: Partial<MemoryItem> = {
        id: editingId,
        title: form.title.trim() || undefined,
        content,
        category: form.category,
        tags: parseMemoryTags(form.tags),
        enabled: form.enabled,
      };

      const saved = await saveStoredMemory(updatedMemory);
      if (saved) {
        setMemories((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? { ...m, ...updatedMemory, updatedAt: Date.now() }
              : m
          )
        );
        toast.success("Memory updated successfully.");
        resetForm();
      }
      return;
    }

    const nextMemory = createMemoryItem({
      title: form.title.trim() || undefined,
      content,
      category: form.category,
      source: "manual",
      tags: parseMemoryTags(form.tags),
      enabled: form.enabled,
    });

    const saved = await saveStoredMemory(nextMemory);
    if (saved) {
      const mappedSaved = {
        ...saved,
        id: saved._id || saved.id,
      };
      setMemories((prev) => [mappedSaved, ...prev]);
      toast.success("Memory saved successfully.");
      resetForm();
    }
  };

  const editMemory = (memory: MemoryItem) => {
    setEditingId(memory.id);
    setForm({
      title: memory.title || "",
      content: memory.content,
      category: memory.category,
      tags: (memory.tags || []).join(", "),
      enabled: memory.enabled,
    });
    setOpenDrawer(true);
  };

  const toggleMemory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const memory = memories.find((m) => m.id === id);
    if (!memory) return;

    const updated = {
      id,
      enabled: !memory.enabled,
    };

    const saved = await saveStoredMemory(updated);
    if (saved) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
      );
      toast.success(memory.enabled ? "Memory disabled" : "Memory enabled");
    }
  };

  const deleteMemory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm("Are you sure you want to remove this memory?");
    if (!confirm) return;

    setDeletingId(id);
    try {
      const ok = await deleteStoredMemory(id);
      if (ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success("Memory removed.");
        if (editingId === id) {
          resetForm();
        }
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full w-full max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-app-border-default/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Brain className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-app-text-primary tracking-tight">
                  Jarvis Memory
                </h2>
                {memories.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-app-surface-elevated text-app-text-secondary border border-app-border-default/25">
                    {memories.length} {memories.length === 1 ? "fact" : "facts"}
                  </span>
                )}
              </div>
              <p className="text-xs text-app-text-muted mt-0.5">
                Facts, preferences, and custom instructions Jarvis retains across sessions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpenDrawer(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-app-text-primary text-app-surface hover:bg-app-text-secondary text-xs font-medium transition-all shadow-xs cursor-pointer self-start sm:self-center shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Add Memory</span>
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-app-text-muted transition-colors group-focus-within:text-brand-primary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories, tags, topics..."
              className="w-full h-9.5 bg-app-surface-elevated/70 border border-app-border-default/20 rounded-xl pl-10 pr-9 py-1.5 text-[13px] text-app-text-primary placeholder:text-app-text-muted/70 focus:outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-app-text-muted hover:text-app-text-primary rounded-full transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-3 h-9 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap",
                categoryFilter === "all"
                  ? "bg-app-surface-elevated text-app-text-primary border-app-border-default/40 shadow-xs"
                  : "bg-app-surface-elevated/30 text-app-text-muted border-app-border-default/15 hover:text-app-text-primary hover:bg-app-surface-elevated/60"
              )}
            >
              All
            </button>
            {memoryCategories.map((c) => {
              const active = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id as MemoryCategory)}
                  className={cn(
                    "px-3 h-9 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap capitalize",
                    active
                      ? "bg-app-surface-elevated text-app-text-primary border-app-border-default/40 shadow-xs"
                      : "bg-app-surface-elevated/30 text-app-text-muted border-app-border-default/15 hover:text-app-text-primary hover:bg-app-surface-elevated/60"
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Memory Cards Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[280px] max-h-[calc(70vh-190px)]">
          {isSyncing ? (
            <div className="flex h-44 flex-col items-center justify-center text-app-text-primary">
              <div className="size-6 rounded-full border-2 border-app-border-default border-t-brand-primary animate-spin mb-2" />
              <span className="text-xs tracking-wider text-app-text-muted">Loading memories...</span>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center border border-dashed border-app-border-default/20 rounded-2xl bg-app-surface-elevated/10">
              <div className="p-3 rounded-2xl bg-app-surface-elevated/60 text-app-text-muted mb-2.5 border border-app-border-default/20">
                <Brain className="size-5 text-app-text-muted" />
              </div>
              <h3 className="text-sm font-medium text-app-text-primary">
                {query ? "No matching memories" : "No memories saved yet"}
              </h3>
              <p className="text-xs text-app-text-muted mt-1 max-w-sm">
                {query
                  ? `No memories matched "${query}". Try searching another keyword or clear filters.`
                  : "Jarvis automatically creates memories during chat, or you can add custom instructions manually."}
              </p>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-3.5 px-3 py-1.5 text-xs font-medium bg-app-surface-elevated hover:bg-app-surface-elevated/80 text-app-text-primary rounded-lg border border-app-border-default/30 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredMemories.map((memory) => {
              const catTheme =
                CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.fact;

              return (
                <div
                  key={memory.id}
                  onClick={() => editMemory(memory)}
                  className={cn(
                    "group relative flex flex-col gap-2 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none",
                    memory.enabled
                      ? "border-app-border-default/15 bg-app-surface-elevated/35 hover:bg-app-surface-elevated/75 hover:border-app-border-default/35"
                      : "border-app-border-default/10 bg-app-surface-elevated/15 opacity-60 hover:opacity-90"
                  )}
                >
                  {/* Top Bar: Title, Category Badge, Status Toggle, Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-[13px] font-medium text-app-text-primary truncate tracking-tight">
                        {memory.title || "Untitled Fact"}
                      </h4>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize shrink-0",
                          catTheme.bg,
                          catTheme.text,
                          catTheme.border
                        )}
                      >
                        {memory.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Active Status Switch Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleMemory(memory.id, e)}
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer border",
                          memory.enabled
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                            : "bg-app-surface-elevated text-app-text-muted border-app-border-default/20 hover:text-app-text-primary"
                        )}
                        title={memory.enabled ? "Click to disable" : "Click to enable"}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            memory.enabled ? "bg-emerald-400" : "bg-app-text-muted"
                          )}
                        />
                        <span>{memory.enabled ? "Active" : "Disabled"}</span>
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          editMemory(memory);
                        }}
                        className="p-1.5 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated rounded-lg transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                        title="Edit memory"
                      >
                        <Pencil className="size-3.5" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => deleteMemory(memory.id, e)}
                        className="p-1.5 text-app-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete memory"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Memory Content Text */}
                  <p className="text-xs text-app-text-secondary leading-relaxed line-clamp-3">
                    {memory.content}
                  </p>

                  {/* Bottom Metadata: Tags & Timestamp */}
                  <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-app-border-default/10 text-[11px] text-app-text-muted">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {memory.tags && memory.tags.length > 0 ? (
                        memory.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-app-surface-elevated/70 text-app-text-muted border border-app-border-default/15 text-[10px]"
                          >
                            <Tag className="size-2.5 opacity-60" />
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-app-text-muted/60 capitalize">
                          Source: {memory.source || "manual"}
                        </span>
                      )}
                    </div>

                    {memory.updatedAt && (
                      <span
                        className="flex items-center gap-1 shrink-0 text-app-text-muted/70"
                        title={format(memory.updatedAt, "PPpp")}
                      >
                        <Clock className="size-2.5" />
                        {formatDistanceToNow(memory.updatedAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DRAWER / MODAL FOR ADDING & EDITING MEMORY */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-all duration-200 flex items-center justify-center p-4",
          openDrawer ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          onClick={resetForm}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        <div
          className={cn(
            "relative w-full max-w-lg bg-app-surface border border-app-border-default/30 rounded-2xl shadow-2xl transition-all duration-200 ease-out",
            openDrawer ? "scale-100 translate-y-0" : "scale-95 translate-y-3"
          )}
        >
          <form onSubmit={submitMemory} className="flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 px-6 border-b border-app-border-default/20">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Brain className="size-4" />
                </div>
                <h3 className="font-semibold text-sm text-app-text-primary tracking-tight">
                  {editingId ? "Edit Memory" : "Add New Memory"}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-md text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Favorite Tech Stack, Work Hours..."
                  className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                  Content <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Tell Jarvis what to keep in mind for future conversations..."
                  className="w-full min-h-[110px] resize-none rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 p-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value as MemoryCategory }))
                    }
                    className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 cursor-pointer capitalize"
                  >
                    {memoryCategories.map((category) => (
                      <option key={category.id} value={category.id} className="capitalize">
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={cn(
                      "w-full h-9 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 border",
                      form.enabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : "bg-app-surface-elevated text-app-text-muted border-app-border-default/20"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        form.enabled ? "bg-emerald-400" : "bg-app-text-muted"
                      )}
                    />
                    <span>{form.enabled ? "Active" : "Disabled"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-app-text-secondary block mb-1.5">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g. preferences, nextjs, personal (comma separated)"
                  className="w-full h-9 rounded-xl border border-app-border-default/20 bg-app-surface-elevated/70 px-3 text-[13px] text-app-text-primary outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="p-4 px-6 border-t border-app-border-default/20 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.content.trim()}
                className="px-4 py-1.5 rounded-xl bg-app-text-primary text-app-surface text-xs font-medium hover:bg-app-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {editingId ? "Update Memory" : "Save Memory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

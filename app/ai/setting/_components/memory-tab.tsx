"use client";

import { useState, useMemo } from "react";
import { Brain, Search, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAI } from "@/app/ai/_components/ai-provider";
import { MemoryTable } from "@/app/ai/memory/_components/memory-table";
import {
  createMemoryItem,
  saveStoredMemory,
  deleteStoredMemory,
  memoryCategories,
  parseMemoryTags,
  type MemoryCategory,
  type MemoryItem,
} from "@/lib/memory-storage";

const emptyForm = {
  title: "",
  content: "",
  category: "fact" as MemoryCategory,
  tags: "",
  enabled: true,
};

export function MemoryTab() {
  const { memories, setMemories, isSyncing } = useAI();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [openDrawer, setOpenDrawer] = useState(false);

  // Filter memories
  const filteredMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return memories.filter((memory) => {
      const matchesCategory =
        categoryFilter === "all" || memory.category === categoryFilter;

      const searchable = `${memory.title} ${memory.content} ${(memory.tags || []).join(
        " "
      )}`.toLowerCase();

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
      toast.error("Add something for Jarvis to remember.");
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
        toast.success("Memory updated.");
        resetForm();
      }
      return;
    }

    const nextMemory = createMemoryItem({
      title: form.title,
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
        id: saved._id,
      };
      setMemories((prev) => [mappedSaved, ...prev]);
      toast.success("Memory saved.");
      resetForm();
    }
  };

  const editMemory = (memory: MemoryItem) => {
    setEditingId(memory.id);
    setForm({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      tags: (memory.tags || []).join(", "),
      enabled: memory.enabled,
    });
    setOpenDrawer(true);
  };

  const toggleMemory = async (id: string) => {
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

  const deleteMemory = async (id: string) => {
    const ok = await deleteStoredMemory(id);
    if (ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Memory removed.");
      if (editingId === id) {
        resetForm();
      }
    }
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-6 pb-4">
          <h2 className="text-xl font-semibold">Jarvis Memory</h2>
          <button
            onClick={() => {
              resetForm();
              setOpenDrawer(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface-elevated border border-app-border-default rounded-full text-sm font-medium hover:bg-app-surface-glass transition cursor-pointer"
          >
            <Plus className="size-4" />
            Add Memory
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-[13px] text-app-text-muted mb-6">
            Manage information and context limits that Jarvis keeps in mind across conversations.
          </p>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-app-text-ghost" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search memory titles, tags..."
                className="h-9 w-full rounded-full border border-app-border-default bg-app-surface-elevated pl-9 pr-3 text-sm text-app-text-primary outline-none placeholder:text-app-text-faint focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as MemoryCategory | "all")}
              className="h-9 rounded-full border border-app-border-default bg-app-surface-elevated px-3 text-sm text-app-text-primary outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="all">All Categories</option>
              {memoryCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className=" rounded-xl overflow-hidden">
            {isSyncing ? (
              <div className="flex h-40 flex-col items-center justify-center text-app-text-primary">
                <div className="size-6 rounded-full border-2 border-app-border-default border-t-brand-primary animate-spin mb-3" />
                <span className="text-xs uppercase tracking-widest text-app-text-ghost">Loading</span>
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <Brain className="size-8 text-app-text-ghost mb-3" />
                <h3 className="text-sm font-medium text-app-text-primary">No memories found</h3>
                <p className="text-xs text-app-text-muted mt-1">Try adjusting your search or add a new memory.</p>
              </div>
            ) : (
              <div className="[&_table]:text-sm">
                <MemoryTable
                  data={filteredMemories}
                  onEdit={editMemory}
                  onDelete={deleteMemory}
                  onToggle={toggleMemory}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRAWER FOR ADDING/EDITING MEMORY - Simplified to match new aesthetic */}
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-all duration-300 flex items-center justify-center p-4",
          openDrawer ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          onClick={resetForm}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        <div
          className={cn(
            "relative w-full max-w-lg bg-app-surface border border-app-border-default rounded-2xl shadow-2xl transition-transform duration-300 ease-out",
            openDrawer ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          )}
        >
          <form onSubmit={submitMemory} className="flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-app-border-default">
              <h2 className="font-semibold text-lg">
                {editingId ? "Edit Memory" : "Add Memory"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-md text-app-text-muted hover:bg-app-surface-elevated transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-app-text-muted block mb-1.5">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Short memory key"
                  className="w-full h-10 rounded-lg border border-app-border-default bg-app-background px-3 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-app-text-muted block mb-1.5">
                  Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Tell Jarvis what to keep in mind..."
                  className="w-full min-h-[120px] resize-none rounded-lg border border-app-border-default bg-app-background p-3 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-app-text-muted block mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as MemoryCategory }))}
                    className="w-full h-10 rounded-lg border border-app-border-default bg-app-background px-3 text-sm outline-none focus:border-brand-primary cursor-pointer"
                  >
                    {memoryCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-app-text-muted block mb-1.5">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={cn(
                      "w-full h-10 rounded-lg border text-sm font-medium transition cursor-pointer flex items-center justify-center",
                      form.enabled
                        ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary"
                        : "bg-app-surface-elevated border-app-border-default text-app-text-muted"
                    )}
                  >
                    {form.enabled ? "Active" : "Disabled"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-app-text-muted block mb-1.5">
                  Tags
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g. work, coding (comma separated)"
                  className="w-full h-10 rounded-lg border border-app-border-default bg-app-background px-3 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="p-5 border-t border-app-border-default flex justify-end gap-3 bg-app-surface-elevated/30 rounded-b-2xl">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-app-text-secondary hover:text-app-text-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.content.trim()}
                className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import {
  Brain,
  Check,
  ChevronDown,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  createMemoryItem,
  saveStoredMemory,
  deleteStoredMemory,
  memoryCategories,
  parseMemoryTags,
  type MemoryCategory,
  type MemoryItem,
} from "@/lib/memory-storage";
import { useAI } from "../_components/ai-provider";
import { PageHeader } from "../_components/page-header";
import { MemoryTable } from "./_components/memory-table";


const emptyForm = {
  title: "",
  content: "",
  category: "fact" as MemoryCategory,
  tags: "",
  enabled: true,
};

export default function MemoryPage() {
  const {
    memories,
    setMemories,
    setMobileSidebarOpen,
    isSyncing,
  } = useAI();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    MemoryCategory | "all"
  >("all");

  const [form, setForm] = useState(emptyForm);
  const [openDrawer, setOpenDrawer] = useState(false);

  const filteredMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return memories.filter((memory) => {
      const matchesCategory =
        categoryFilter === "all" ||
        memory.category === categoryFilter;

      const searchable = `${memory.title} ${memory.content} ${(memory.tags || []).join(
        " "
      )}`.toLowerCase();

      return (
        matchesCategory &&
        (!normalizedQuery ||
          searchable.includes(normalizedQuery))
      );
    });
  }, [memories, query, categoryFilter]);

  const enabledCount = memories.filter(
    (memory) => memory.enabled
  ).length;

  const disabledCount = memories.filter(
    (memory) => !memory.enabled
  ).length;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenDrawer(false);
  };

  const submitMemory = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
              ? {
                ...m,
                ...updatedMemory,
                updatedAt: Date.now(),
              }
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
        prev.map((m) =>
          m.id === id
            ? {
              ...m,
              enabled: !m.enabled,
            }
            : m
        )
      );
    }
  };

  const deleteMemory = async (id: string) => {
    const ok = await deleteStoredMemory(id);

    if (ok) {
      setMemories((prev) =>
        prev.filter((m) => m.id !== id)
      );

      toast.success("Memory removed.");

      if (editingId === id) {
        resetForm();
      }
    }
  };

  if (isSyncing) {
    return (
      <div className="flex h-full items-center justify-center bg-app-canvas text-app-text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 rounded-full border-2 border-app-border-default border-t-app-text-primary animate-spin" />
          <span className="text-xs uppercase tracking-[0.3em] text-app-text-ghost">
            Syncing memories
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <PageHeader
        icon={<Brain />}
        title="Memory"
        subtitle="Manage what Jarvis remembers across conversations"
      >
        <div className="flex items-center justify-end gap-3 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-app-text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories..."
              className="h-9 w-full rounded-full border border-app-border-default bg-app-surface-glass pl-9 pr-4 text-xs text-app-text-primary outline-none transition-all placeholder:text-app-text-faint focus:border-app-border-strong"
            />
          </div>
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-app-border-default bg-app-surface-glass px-4 text-xs text-app-text-soft transition-all hover:text-app-text-primary"
            >
              {categoryFilter === "all" ? "All Categories" : memoryCategories.find(c => c.id === categoryFilter)?.label}
              <ChevronDown size={14} className="opacity-40" />
            </button>
            <ul tabIndex={0} className="dropdown-content z-10 menu mt-2 w-48 rounded-xl border border-app-border-default bg-app-surface-elevated p-2 shadow-2xl">
              <li>
                <button 
                  onClick={() => setCategoryFilter("all")}
                  className={cn("py-2 text-xs", categoryFilter === "all" ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                >
                  All Categories
                </button>
              </li>
              {memoryCategories.map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => setCategoryFilter(category.id)}
                    className={cn("py-2 text-xs", categoryFilter === category.id ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                  >
                    {category.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageHeader>

      {/* CONTENT */}

      <div className="mx-auto w-full max-w-8xl overflow-y-auto px-5 py-6">
        {filteredMemories.length === 0 ? (
          <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-dashed border-app-border-default bg-app-canvas px-6 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-3xl border border-app-border-default bg-app-surface-glass-soft">
              <Brain className="size-7 text-app-text-ghost" />
            </div>

            <h2 className="text-xl font-semibold">
              No memories yet
            </h2>

            <p className="mt-3 max-w-md text-sm leading-7 text-app-text-faint">
              Save important preferences, facts,
              and context for Jarvis to remember
              across conversations.
            </p>

            <button
              onClick={() =>
                setOpenDrawer(true)
              }
              className="mt-6 h-11 rounded-xl bg-app-primary px-5 text-sm font-medium text-app-primary-foreground transition hover:bg-app-primary-hover"
            >
              Add your first memory
            </button>
          </div>
        ) : (
          <MemoryTable
            data={filteredMemories}
            onEdit={editMemory}
            onDelete={deleteMemory}
            onToggle={toggleMemory}
          />

        )}
      </div>

      {/* FLOATING BUTTON */}

      <button
        onClick={() => {
          resetForm();
          setOpenDrawer(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-2xl bg-app-primary px-5 text-sm font-semibold text-app-primary-foreground shadow-2xl transition hover:bg-app-primary-hover"
      >
        <Plus size={18} />
        Add Memory
      </button>

      {/* DRAWER */}

      <div
        className={`fixed inset-0 z-50 transition ${openDrawer
          ? "pointer-events-auto"
          : "pointer-events-none"
          }`}
      >
        <div
          onClick={resetForm}
          className={`absolute inset-0 bg-app-overlay backdrop-blur-sm transition ${openDrawer
            ? "opacity-100"
            : "opacity-0"
            }`}
        />

        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-app-border-default bg-app-canvas transition-transform duration-300 ${openDrawer
            ? "translate-x-0"
            : "translate-x-full"
            }`}
        >
          <form
            onSubmit={submitMemory}
            className="h-full flex flex-col"
          >
            <div className="flex h-16 items-center justify-between border-b border-app-border-default px-5">
              <div>
                <h2 className="font-semibold">
                  {editingId
                    ? "Edit Memory"
                    : "Add Memory"}
                </h2>

                <p className="mt-1 text-xs text-app-text-faint">
                  Enabled memories are used in
                  future chats
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="flex size-9 items-center justify-center rounded-xl text-app-text-faint hover:bg-app-surface-glass"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-app-text-faint">
                    Title
                  </label>

                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Short label"
                    className="mt-2 h-12 w-full rounded-2xl border border-app-border-default bg-app-surface px-4 text-sm text-app-text-primary outline-none focus:border-app-border-strong"
                  />
                </div>

                <div>
                  <label className="text-xs text-app-text-faint">
                    Memory
                  </label>

                  <textarea
                    value={form.content}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Remember that..."
                    className="mt-2 min-h-[180px] w-full resize-none rounded-2xl border border-app-border-default bg-app-surface p-4 text-sm leading-7 text-app-text-primary outline-none focus:border-app-border-strong"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-app-text-faint">
                      Category
                    </label>

                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          category:
                            e.target
                              .value as MemoryCategory,
                        }))
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-app-border-default bg-app-surface px-4 text-sm text-app-text-primary outline-none focus:border-app-border-strong"
                    >
                      {memoryCategories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-app-text-faint">
                      Status
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          enabled:
                            !prev.enabled,
                        }))
                      }
                      className={`mt-2 h-12 w-full rounded-2xl border text-sm font-medium transition ${form.enabled
                        ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-100"
                        : "border-app-border-default bg-app-surface text-app-text-faint"
                        }`}
                    >
                      {form.enabled
                        ? "Enabled"
                        : "Disabled"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-app-text-faint">
                    Tags
                  </label>

                  <input
                    value={form.tags}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tags: e.target.value,
                      }))
                    }
                    placeholder="react, work, preference"
                    className="mt-2 h-12 w-full rounded-2xl border border-app-border-default bg-app-surface px-4 text-sm text-app-text-primary outline-none focus:border-app-border-strong"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-app-border-default p-5">
              <button
                type="submit"
                disabled={!form.content.trim()}
                className="h-12 w-full rounded-2xl bg-app-primary text-sm font-semibold text-app-primary-foreground transition hover:bg-app-primary-hover disabled:bg-app-surface-glass-strong disabled:text-app-text-ghost"
              >
                {editingId
                  ? "Update Memory"
                  : "Save Memory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

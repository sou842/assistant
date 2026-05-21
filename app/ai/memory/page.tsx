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

      const searchable = `${memory.title} ${memory.content} ${memory.tags.join(
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
      tags: memory.tags.join(", "),
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
      <div className="h-full bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <span className="text-xs uppercase tracking-[0.3em] text-white/30">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/25" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories..."
              className="h-9 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-4 text-xs outline-none focus:border-white/20 transition-all"
            />
          </div>
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              className="h-9 px-4 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              {categoryFilter === "all" ? "All Categories" : memoryCategories.find(c => c.id === categoryFilter)?.label}
              <ChevronDown size={14} className="opacity-40" />
            </button>
            <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-2xl bg-[#0F0F0F] border border-white/10 rounded-xl w-48 mt-2">
              <li>
                <button 
                  onClick={() => setCategoryFilter("all")}
                  className={cn("text-xs py-2", categoryFilter === "all" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
                >
                  All Categories
                </button>
              </li>
              {memoryCategories.map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => setCategoryFilter(category.id)}
                    className={cn("text-xs py-2", categoryFilter === category.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
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

      <div className="w-full mx-auto max-w-8xl px-5 py-6 overflow-y-auto">
        {filteredMemories.length === 0 ? (
          <div className="min-h-[500px] rounded-3xl border border-dashed border-white/10 bg-[#050505] flex flex-col items-center justify-center text-center px-6">
            <div className="size-16 rounded-3xl bg-white/3 border border-white/10 flex items-center justify-center mb-5">
              <Brain className="size-7 text-white/25" />
            </div>

            <h2 className="text-xl font-semibold">
              No memories yet
            </h2>

            <p className="max-w-md mt-3 text-sm leading-7 text-white/35">
              Save important preferences, facts,
              and context for Jarvis to remember
              across conversations.
            </p>

            <button
              onClick={() =>
                setOpenDrawer(true)
              }
              className="mt-6 h-11 px-5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition"
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
        className="fixed bottom-6 right-6 z-40 h-14 px-5 rounded-2xl bg-white text-black shadow-2xl flex items-center gap-2 text-sm font-semibold hover:bg-white/90 transition"
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
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${openDrawer
            ? "opacity-100"
            : "opacity-0"
            }`}
        />

        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-black transition-transform duration-300 ${openDrawer
            ? "translate-x-0"
            : "translate-x-full"
            }`}
        >
          <form
            onSubmit={submitMemory}
            className="h-full flex flex-col"
          >
            <div className="h-16 border-b border-white/10 px-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  {editingId
                    ? "Edit Memory"
                    : "Add Memory"}
                </h2>

                <p className="text-xs text-white/35 mt-1">
                  Enabled memories are used in
                  future chats
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="size-9 rounded-xl hover:bg-white/[0.05] flex items-center justify-center text-white/40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-white/40">
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
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#070707] px-4 text-sm outline-none focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40">
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
                    className="mt-2 min-h-[180px] w-full resize-none rounded-2xl border border-white/10 bg-[#070707] p-4 text-sm leading-7 outline-none focus:border-white/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40">
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
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#070707] px-4 text-sm outline-none focus:border-white/20"
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
                    <label className="text-xs text-white/40">
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
                        : "border-white/10 bg-[#070707] text-white/35"
                        }`}
                    >
                      {form.enabled
                        ? "Enabled"
                        : "Disabled"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40">
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
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#070707] px-4 text-sm outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/10">
              <button
                type="submit"
                disabled={!form.content.trim()}
                className="h-12 w-full rounded-2xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:bg-white/10 disabled:text-white/20 transition"
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
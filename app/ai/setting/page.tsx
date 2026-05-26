"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Moon,
  Sun,
  Laptop,
  Check,
  Brain,
  Search,
  ChevronDown,
  Plus,
  X,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAI } from "../_components/ai-provider";
import { PageHeader } from "../_components/page-header";
import { MemoryTable } from "../memory/_components/memory-table";
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

type SettingTab = "appearance" | "memory";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tabs management
  const currentTab = (searchParams.get("tab") as SettingTab) || "appearance";
  const setActiveTab = (tab: SettingTab) => {
    router.push(`/ai/setting?tab=${tab}`);
  };

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Memory states from context
  const { memories, setMemories, isSyncing } = useAI();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [openDrawer, setOpenDrawer] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  const themes = [
    {
      id: "light",
      name: "Light Theme",
      description: "Clean and bright high-contrast theme",
      icon: Sun,
    },
    {
      id: "dark",
      name: "Dark Theme",
      description: "Sleek and easy on the eyes at night",
      icon: Moon,
    },
    {
      id: "system",
      name: "System Sync",
      description: "Dynamically matches device system settings",
      icon: Laptop,
    },
  ];

  const tabs = [
    {
      id: "appearance" as SettingTab,
      label: "Appearance",
      icon: Sun,
    },
    {
      id: "memory" as SettingTab,
      label: "Jarvis Memory",
      icon: Brain,
    },
  ];

  return (
    <div className="flex h-screen flex-col bg-app-background overflow-hidden">
      {/* Properly Aligned Global Page Header */}
      <PageHeader
        icon={<Settings />}
        title="Settings"
        subtitle="Configure client visual themes and manage knowledge memories"
        actions={
          <div className="inline-flex p-0.5 bg-app-surface border border-app-border-default rounded-full shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-glass-soft"
                  )}
                >
                  <Icon className="size-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
          {/* 1. APPEARANCE TAB */}
          {currentTab === "appearance" && (
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-3xl border border-app-border-default bg-app-surface p-8 shadow-sm">
                <div className="relative">
                  <div className="mb-8 flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-app-text-primary">
                        Interface Theme
                      </h2>
                      <p className="mt-2 text-sm text-app-text-muted">
                        Select your preferred client layout scheme.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {themes.map((t) => {
                      const Icon = t.icon;
                      const isActive = theme === t.id;

                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 cursor-pointer flex items-center gap-4",
                            isActive
                              ? "border-brand-primary bg-app-surface-elevated shadow-sm ring-1 ring-brand-primary/20"
                              : "border-app-border-default bg-app-surface hover:border-app-border-strong hover:bg-app-surface-elevated/40"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-350",
                              isActive
                                ? "bg-brand-primary text-white scale-105"
                                : "bg-app-surface-elevated text-app-text-muted group-hover:text-app-text-primary"
                            )}
                          >
                            <Icon className="size-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={cn(
                                "text-sm font-semibold transition-colors",
                                isActive ? "text-app-text-primary" : "text-app-text-secondary"
                              )}
                            >
                              {t.name}
                            </h3>
                            <p className="mt-1 text-xs text-app-text-muted leading-relaxed truncate">
                              {t.description}
                            </p>
                          </div>

                          {isActive && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary">
                              <Check className="size-3.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* 2. MEMORY TAB */}
          {currentTab === "memory" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-app-text-primary">
                    Memory Manager
                  </h2>
                  <p className="mt-1.5 text-sm text-app-text-muted font-normal">
                    Manage information and context limits that Jarvis keeps in mind across conversations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setOpenDrawer(true);
                  }}
                  className="flex h-11 items-center gap-2 rounded-xl bg-app-primary px-5 text-sm font-semibold text-app-primary-foreground shadow-md transition hover:bg-app-primary-hover cursor-pointer self-start md:self-auto"
                >
                  <Plus size={16} />
                  Add Memory
                </button>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full bg-app-surface/55 p-4 border border-app-border-default rounded-2xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-app-text-ghost" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search memory titles, contents, tags..."
                    className="h-10 w-full rounded-xl border border-app-border-default bg-app-surface pl-10 pr-4 text-sm text-app-text-primary outline-none transition-all placeholder:text-app-text-faint focus:border-app-border-strong"
                  />
                </div>
                <div className="dropdown dropdown-end w-full sm:w-auto">
                  <button
                    tabIndex={0}
                    className="flex h-10 w-full sm:w-auto cursor-pointer items-center justify-between gap-2 rounded-xl border border-app-border-default bg-app-surface px-4 text-sm text-app-text-soft transition-all hover:text-app-text-primary"
                  >
                    <span>
                      {categoryFilter === "all"
                        ? "All Categories"
                        : memoryCategories.find((c) => c.id === categoryFilter)
                          ?.label}
                    </span>
                    <ChevronDown size={14} className="opacity-40" />
                  </button>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-10 menu mt-2 w-48 rounded-xl border border-app-border-default bg-app-surface-elevated p-2 shadow-2xl"
                  >
                    <li>
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className={cn(
                          "py-2 text-xs",
                          categoryFilter === "all"
                            ? "bg-app-surface-glass-strong text-app-text-primary"
                            : "text-app-text-faint hover:bg-app-surface-glass"
                        )}
                      >
                        All Categories
                      </button>
                    </li>
                    {memoryCategories.map((category) => (
                      <li key={category.id}>
                        <button
                          onClick={() => setCategoryFilter(category.id)}
                          className={cn(
                            "py-2 text-xs",
                            categoryFilter === category.id
                              ? "bg-app-surface-glass-strong text-app-text-primary"
                              : "text-app-text-faint hover:bg-app-surface-glass"
                          )}
                        >
                          {category.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Memories Table Display */}
              {isSyncing ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-app-border-default bg-app-surface text-app-text-primary">
                  <div className="size-8 rounded-full border-2 border-app-border-default border-t-app-text-primary animate-spin mb-3" />
                  <span className="text-xs uppercase tracking-[0.2em] text-app-text-ghost">
                    Loading memories
                  </span>
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-app-border-default bg-app-surface px-6 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-app-border-default bg-app-surface-glass-soft">
                    <Brain className="size-6 text-app-text-ghost" />
                  </div>
                  <h3 className="text-lg font-semibold">No memories matching search query</h3>
                  <p className="mt-2 max-w-sm text-xs leading-5 text-app-text-faint">
                    Try adjusting filters or input search parameter terms.
                  </p>
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
          )}
        </main>
      </div>

      {/* DRAWER FOR ADDING/EDITING MEMORY */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-300",
          openDrawer ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          onClick={resetForm}
          className="absolute inset-0 bg-app-overlay/40 backdrop-blur-sm transition-opacity"
        />

        <div
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-md border-l border-app-border-default bg-app-canvas transition-transform duration-300 ease-out",
            openDrawer ? "translate-x-0" : "translate-x-full"
          )}
        >
          <form onSubmit={submitMemory} className="h-full flex flex-col">
            <div className="flex h-16 items-center justify-between border-b border-app-border-default px-5">
              <div>
                <h2 className="font-bold text-app-text-primary text-base">
                  {editingId ? "Edit Memory" : "Add Memory"}
                </h2>
                <p className="mt-1 text-[11px] text-app-text-faint">
                  Active memories are integrated into AI thinking context.
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="flex size-9 items-center justify-center rounded-xl text-app-text-faint hover:bg-app-surface-glass cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-app-text-soft">
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
                  placeholder="Short memory key (e.g. My Favorite Editor)"
                  className="mt-2 h-11 w-full rounded-xl border border-app-border-default bg-app-surface px-4 text-sm text-app-text-primary outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-app-text-soft">
                  Memory Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Tell Jarvis what to keep in mind..."
                  className="mt-2 min-h-[140px] w-full resize-none rounded-xl border border-app-border-default bg-app-surface p-4 text-sm leading-relaxed text-app-text-primary outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-app-text-soft">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value as MemoryCategory,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-app-border-default bg-app-surface px-3 text-sm text-app-text-primary outline-none focus:border-brand-primary"
                  >
                    {memoryCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-app-text-soft">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        enabled: !prev.enabled,
                      }))
                    }
                    className={cn(
                      "mt-2 h-11 w-full rounded-xl border text-sm font-semibold transition cursor-pointer",
                      form.enabled
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-app-border-default bg-app-surface text-app-text-faint"
                    )}
                  >
                    {form.enabled ? "Active" : "Disabled"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-app-text-soft">
                  Tags (Comma separated)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder="work, workspace, coding"
                  className="mt-2 h-11 w-full rounded-xl border border-app-border-default bg-app-surface px-4 text-sm text-app-text-primary outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="border-t border-app-border-default p-5">
              <button
                type="submit"
                disabled={!form.content.trim()}
                className="h-12 w-full rounded-xl bg-app-primary text-sm font-semibold text-app-primary-foreground transition hover:bg-app-primary-hover disabled:bg-app-surface-glass-strong disabled:text-app-text-ghost cursor-pointer"
              >
                {editingId ? "Update Memory" : "Save Memory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
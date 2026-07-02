"use client";

import React, { useState } from "react";
import { Database, Search, Plus, FileText, Table2, Trash2, ChevronDown, Image as ImageIcon, Pencil, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "../_components/page-header";
import { useAI } from "../_components/ai-provider";
import { VaultItemDialog } from "./_components/vault-item-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VaultPage() {
  const router = useRouter();
  const { setMobileSidebarOpen } = useAI();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "note" | "spreadsheet" | "gallery" | "album">("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id?: string, type: "note" | "spreadsheet" | "gallery" | "album" } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, error, isLoading, mutate } = useSWR(`/api/vault?search=${debouncedQuery}&type=${filterType === 'all' ? '' : filterType}`, fetcher);

  const items = data?.items || [];

  const handleCreate = (type: "note" | "spreadsheet" | "gallery" | "album") => {
    setSelectedItem({ type });
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    router.push(`/ai/vault/${item._id}`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) return;

    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/vault/${id}`, { method: "DELETE" })
        )
      );
      toast.success(`${selectedIds.length} item(s) deleted`);
      setSelectedIds([]);
      mutate();
    } catch (err) {
      toast.error("Failed to delete some items");
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent | React.FocusEvent, id: string, originalTitle: string) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    if (editTitle.trim() === originalTitle) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        toast.success("Item renamed");
        setEditingId(null);
        mutate();
      } else {
        toast.error("Failed to rename item");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <PageHeader
        icon={<Database />}
        title="Vault"
        subtitle="Manage your stored data and documents"
      >
        <div className="flex items-center justify-end gap-3 w-full">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex h-9 items-center gap-2 rounded-full bg-red-400 px-4 text-xs font-semibold text-white transition-all hover:opacity-80 cursor-pointer"
            >
              <Trash2 size={14} />
              Delete {selectedIds.length} Selected
            </button>
          )}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-app-text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vault..."
              className="h-9 w-full rounded-full border border-app-border-default bg-app-surface-glass pl-9 pr-4 text-xs text-app-text-primary outline-none transition-all placeholder:text-app-text-faint focus:border-app-border-strong"
            />
          </div>
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-app-border-default bg-app-surface-glass px-4 text-xs text-app-text-soft transition-all hover:text-app-text-primary"
            >
              {filterType === "all" ? "All Types" : filterType === "note" ? "Notes" : filterType === "spreadsheet" ? "Spreadsheets" : filterType === "gallery" ? "Media Galleries" : "Albums"}
              <ChevronDown size={14} className="opacity-40" />
            </button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu mt-2 w-48 rounded-xl border border-app-border-default bg-app-surface-elevated p-2 shadow-2xl">
              <li>
                <button
                  onClick={() => setFilterType("all")}
                  className={cn("py-2 text-xs", filterType === "all" ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                >
                  All Types
                </button>
              </li>
              <li>
                <button
                  onClick={() => setFilterType("note")}
                  className={cn("py-2 text-xs", filterType === "note" ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                >
                  Notes
                </button>
              </li>
              <li>
                <button
                  onClick={() => setFilterType("spreadsheet")}
                  className={cn("py-2 text-xs", filterType === "spreadsheet" ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                >
                  Spreadsheets
                </button>
              </li>
              <li>
                <button
                  onClick={() => setFilterType("gallery")}
                  className={cn("py-2 text-xs", filterType === "gallery" ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                >
                  Media Galleries
                </button>
              </li>
              <li>
                <button
                  onClick={() => setFilterType("album")}
                  className={cn("py-2 text-xs", filterType === "album" ? "bg-app-surface-glass-strong text-app-text-primary" : "text-app-text-faint hover:bg-app-surface-glass")}
                >
                  Albums
                </button>
              </li>
            </ul>
          </div>
        </div>
      </PageHeader>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-8xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="size-8 rounded-full border-2 border-app-border-default border-t-app-text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="py-20 text-center text-app-danger-strong">Failed to load vault items.</div>
          ) : items?.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-app-border-default bg-app-canvas px-6 text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-3xl border border-app-border-default bg-app-surface-glass-soft">
                <Database className="size-7 text-app-text-ghost" />
              </div>
              <h2 className="text-xl font-semibold">Vault is empty</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-app-text-faint">
                Create a note or spreadsheet, or ask Jarvis to save data for you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items?.map((item: any) => {
                const isSelected = selectedIds?.includes(item._id);
                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      if (selectedIds.length > 0) {
                        setSelectedIds((prev) =>
                          prev.includes(item._id)
                            ? prev.filter((id) => id !== item._id)
                            : [...prev, item._id]
                        );
                      } else {
                        handleEdit(item);
                      }
                    }}
                    className={cn(
                      "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-app-surface-glass-soft p-5 transition-all hover:bg-app-surface-glass",
                      isSelected ? "border-brand-primary bg-app-primary/5" : "border-app-border-subtle"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className={`rounded-full p-2.5 ${item.type === "note"
                          ? "bg-blue-500"
                          : item.type === "spreadsheet"
                            ? "bg-green-500"
                            : item.type === "album"
                              ? "bg-pink-500"
                              : "bg-purple-500"
                          }`}
                      >
                        {item.type === "note" ? (
                          <FileText size={24} className="text-gray-50" />
                        ) : item.type === "spreadsheet" ? (
                          <Table2 size={24} className="text-gray-50" />
                        ) : (
                          <ImageIcon size={24} className="text-gray-50" />
                        )}
                      </div>
                      <div className={cn("flex items-center gap-1 transition-all", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(item._id);
                            setEditTitle(item.title);
                          }}
                          className="cursor-pointer rounded-full p-1.5 text-app-text-ghost hover:bg-app-surface-glass-strong hover:text-app-text-primary"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds((prev) =>
                              prev.includes(item._id)
                                ? prev.filter((id) => id !== item._id)
                                : [...prev, item._id]
                            );
                          }}
                          className={cn(
                            "cursor-pointer rounded-full p-1.5",
                            isSelected
                              ? "text-app-primary hover:text-app-primary/80"
                              : "text-app-text-ghost hover:bg-app-surface-glass-strong hover:text-app-text-primary"
                          )}
                        >
                          {isSelected ? <CheckCircle2 size={20} className="text-brand-primary" /> : <Circle size={18} />}
                        </button>
                      </div>
                    </div>

                    {editingId === item._id ? (
                      <form
                        onSubmit={(e) => handleRenameSubmit(e, item._id, item.title)}
                        className="mb-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={(e) => handleRenameSubmit(e, item._id, item.title)}
                          className="w-full bg-app-surface-glass border border-app-border-strong rounded px-2 py-1 text-sm font-semibold text-app-text-primary outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </form>
                    ) : (
                      <h3 className="mb-1 truncate font-semibold text-app-text-primary">{item.title}</h3>
                    )}
                    <div className="mb-4 flex items-center gap-2 text-xs text-app-text-faint">
                      <span className="capitalize">{item.type}</span>
                      <span>•</span>
                      <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-1 border-t border-app-border-subtle pt-4">
                        {item.tags.slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="rounded-full border border-app-border-subtle bg-app-surface-glass px-2 py-0.5 text-[10px] text-app-text-soft">
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="rounded-full border border-app-border-subtle bg-app-surface-glass px-2 py-0.5 text-[10px] text-app-text-soft">
                            +{item.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING NEW ITEM BUTTON */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="dropdown dropdown-top dropdown-end">
          <button
            tabIndex={0}
            className="group flex size-14 cursor-pointer items-center justify-center rounded-full bg-app-primary text-app-primary-foreground shadow-2xl transition-all hover:scale-110 hover:bg-app-primary-hover active:scale-95"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <ul tabIndex={0} className="dropdown-content z-[1] menu mb-4 w-48 rounded-xl border border-app-border-default bg-app-surface-elevated p-2 shadow-2xl">
            <li>
              <button onClick={() => handleCreate("note")} className="flex items-center gap-3 py-3 text-sm text-app-text-primary transition hover:bg-app-surface-glass">
                <FileText size={18} className="text-blue-400" />
                New Note
              </button>
            </li>
            <li>
              <button onClick={() => handleCreate("spreadsheet")} className="flex items-center gap-3 py-3 text-sm text-app-text-primary transition hover:bg-app-surface-glass">
                <Table2 size={18} className="text-green-400" />
                New Spreadsheet
              </button>
            </li>
            <li>
              <button onClick={() => handleCreate("album")} className="flex items-center gap-3 py-3 text-sm text-app-text-primary transition hover:bg-app-surface-glass">
                <ImageIcon size={18} className="text-pink-400" />
                New Album
              </button>
            </li>
          </ul>
        </div>
      </div>

      {dialogOpen && selectedItem && (
        <VaultItemDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedItem(null);
            mutate();
          }}
          itemId={selectedItem.id}
          type={selectedItem.type}
        />
      )}
    </div>
  );
}

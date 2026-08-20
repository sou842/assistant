"use client";

import React, { useState } from "react";
import { Briefcase, Search, Plus, Trash2, Pencil, FileBadge } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "../_components/page-header";
import { VaultItemDialog } from "../vault/_components/vault-item-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StudioPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch only document items
  const { data, error, isLoading, mutate } = useSWR(`/api/studio?search=${debouncedQuery}`, fetcher);

  const items = data?.items || [];

  const handleEdit = (item: any) => {
    router.push(`/ai/studio/${item._id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/studio/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Document deleted");
        mutate();
      } else {
        toast.error("Failed to delete document");
      }
    } catch (err) {
      toast.error("An error occurred");
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
      const res = await fetch(`/api/studio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        toast.success("Document renamed");
        setEditingId(null);
        mutate();
      } else {
        toast.error("Failed to rename document");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };
  return (
    <div className="min-h-screen bg-app-canvas flex flex-col">
      {/* HEADER */}
      <PageHeader
        icon={<Briefcase className="text-brand-primary" />}
        title="Studio"
      >
        <div className="flex items-center justify-end gap-3 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-app-text-ghost" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="h-9 w-full rounded-full border border-transparent bg-app-surface pl-9 pr-4 text-xs text-app-text-primary outline-none transition-all placeholder:text-app-text-ghost focus:border-app-border-default/40 focus:ring-0 focus:outline-none"
            />
          </div>
        </div>
      </PageHeader>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-8xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="size-8 rounded-full border-2 border-app-border-default/30 border-t-brand-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="py-20 text-center text-app-danger-strong text-sm">Failed to load documents.</div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-transparent bg-app-surface px-6 text-center shadow-xs">
              <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-app-surface-elevated">
                <FileBadge className="size-7 text-app-text-secondary" />
              </div>
              <h2 className="text-lg font-semibold text-app-text-primary tracking-tight">No Documents Found</h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-app-text-muted">
                Create a new document to build a professional resume, presentation slide, or report.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item: any) => (
                <div
                  key={item._id}
                  onClick={() => handleEdit(item)}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-transparent bg-app-surface p-5 transition-all duration-300 hover:bg-app-surface-hover hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="rounded-full bg-app-surface-elevated p-2">
                      <FileBadge size={20} className="text-brand-primary" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(item._id);
                          setEditTitle(item.title);
                        }}
                        className="cursor-pointer rounded-full p-1.5 text-app-text-muted hover:bg-app-surface-elevated hover:text-app-text-primary outline-none transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item._id)}
                        className="cursor-pointer rounded-full p-1.5 text-app-text-muted hover:bg-app-danger-soft hover:text-app-danger-strong outline-none transition-colors"
                      >
                        <Trash2 size={15} />
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
                        className="w-full bg-app-surface-elevated border border-app-border-default/20 rounded-full px-4 py-1.5 text-xs text-app-text-primary outline-none focus:border-app-border-default"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </form>
                  ) : (
                    <h3 className="mb-1 truncate font-semibold text-app-text-primary text-[14px] tracking-tight">{item.title}</h3>
                  )}
                  <div className="mb-4 flex items-center gap-2 text-[11px] text-app-text-ghost">
                    <span>Document</span>
                    <span>•</span>
                    <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1 border-t border-app-border-default/10 pt-4">
                      {item.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="rounded-full bg-app-surface-elevated/40 px-2 py-0.5 text-[10px] text-app-text-soft">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="rounded-full bg-app-surface-elevated/40 px-2 py-0.5 text-[10px] text-app-text-soft">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING NEW ITEM BUTTON */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/studio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Document', content: '' })
              });
              if (res.ok) {
                const data = await res.json();
                router.push(`/ai/studio/${data.item._id}`);
              }
            } catch (err) {
              toast.error("Failed to create document");
            }
          }}
          className="group flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}

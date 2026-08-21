"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Search,
  Plus,
  Trash2,
  Pencil,
  FileBadge,
  Calendar,
  AlertCircle,
  ChevronRight,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "../_components/page-header";
import { useAI } from "../_components/ai-provider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StudioPage() {
  const router = useRouter();
  const { setSidebarOpen } = useAI();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

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
    <div className="min-h-screen bg-app-canvas text-app-text-primary">
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <PageHeader
          icon={<Briefcase className="text-brand-primary" />}
          title="Studio"
        >
          <div className="flex items-center gap-2.5 max-w-sm w-full bg-app-surface-glass border border-app-border-default rounded-full px-3 py-1.5 shadow-sm">
            <Search className="size-3.5 text-app-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-app-text-primary placeholder:text-app-text-muted/60 w-full focus:ring-0 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-app-text-muted hover:text-app-text-primary outline-none">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </PageHeader>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-app-surface border border-app-border-subtle animate-pulse p-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="size-8 bg-app-surface-glass rounded-lg animate-pulse" />
                    <div className="space-y-1.5 flex-1 max-w-md">
                      <div className="h-4 bg-app-surface-glass rounded w-1/3 animate-pulse" />
                      <div className="h-3 bg-app-surface-glass rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 bg-app-surface-glass rounded w-24 animate-pulse" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-20 text-center text-app-danger-strong text-sm">Failed to load documents.</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl max-w-2xl mx-auto space-y-4">
              <div className="size-12 rounded-full bg-app-surface-elevated border border-app-border-default flex items-center justify-center text-app-text-muted">
                <FileBadge className="size-6 text-app-text-secondary" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight">No documents found</h3>
                <p className="text-sm text-app-text-muted mt-1 leading-relaxed">
                  Create a new document to build a professional resume, presentation slide, or report.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-app-surface-glass-soft border border-app-border-subtle rounded-2xl overflow-hidden backdrop-blur-md">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-app-surface-glass border-b border-app-border-subtle text-[10px] font-bold uppercase tracking-wider text-app-text-soft">
                <div className="col-span-5">Document</div>
                <div className="col-span-5">Tags</div>
                <div className="col-span-2 text-right pr-8">Created</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-app-border-subtle">
                {items.map((item: any) => (
                  <div
                    key={item._id}
                    onClick={() => handleEdit(item)}
                    className="group relative grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 items-center hover:bg-app-surface-glass transition-all duration-200 cursor-pointer"
                  >
                    {/* Document Info (Title & Icon) */}
                    <div className="col-span-1 md:col-span-5 flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary relative overflow-hidden group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                        <FileBadge className="size-4.5 relative z-10" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingId === item._id ? (
                          <form
                            onSubmit={(e) => handleRenameSubmit(e, item._id, item.title)}
                            className="flex items-center w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={(e) => handleRenameSubmit(e, item._id, item.title)}
                              className="w-full bg-app-surface-elevated border border-app-border-default rounded-lg px-3 py-1 text-xs text-app-text-primary outline-none focus:border-brand-primary/55 focus:ring-0 focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </form>
                        ) : (
                          <h3 className="font-normal text-app-text-primary text-sm truncate transition-colors duration-200 tracking-tight">
                            {item.title}
                          </h3>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="col-span-1 md:col-span-5 flex flex-wrap gap-1.5 pr-4">
                      {item.tags && item.tags.length > 0 ? (
                        <>
                          {item.tags.slice(0, 3).map((tag: string, i: number) => (
                            <span key={i} className="rounded-full bg-app-surface-elevated border border-app-border-default px-2 py-0.5 text-[10px] text-app-text-muted">
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="rounded-full bg-app-surface-elevated border border-app-border-default px-2 py-0.5 text-[10px] text-app-text-muted">
                              +{item.tags.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-app-text-soft font-normal">No tags</span>
                      )}
                    </div>

                    {/* Created Date & Actions */}
                    <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-4">
                      <span className="flex items-center gap-1.5 text-xs text-app-text-soft md:pr-4">
                        <Calendar className="size-3.5 md:hidden" />
                        {format(new Date(item.createdAt), 'MMM d, yyyy')}
                      </span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(item._id);
                            setEditTitle(item.title);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated rounded-lg transition-all duration-200 cursor-pointer outline-none shrink-0 border border-transparent hover:border-app-border-default"
                          title="Rename document"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, item._id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-app-text-muted hover:text-app-danger-strong hover:bg-app-danger-soft rounded-lg transition-all duration-200 cursor-pointer outline-none shrink-0 border border-transparent hover:border-app-danger-border"
                          title="Delete document"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <ChevronRight className="size-4 text-app-text-soft group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          className="group flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-all hover:scale-105 active:scale-95 border-none outline-none"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}


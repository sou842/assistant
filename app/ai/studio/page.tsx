"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Search,
  Plus,
  Trash2,
  Pencil,
  FileBadge,
  Calendar,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "../_components/page-header";
import { Button } from "@/components/ui/button";

interface StudioDoc {
  _id: string;
  title: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  content?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StudioPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/studio?search=${encodeURIComponent(debouncedQuery)}`,
    fetcher
  );

  const items: StudioDoc[] = useMemo(() => data?.items || [], [data]);

  const handleCreateNew = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document", content: "" }),
      });
      const result = await res.json();
      if (res.ok && result.item?._id) {
        toast.success("Document created successfully");
        router.push(`/ai/studio/${result.item._id}`);
      } else {
        toast.error(result.error || "Failed to create document");
      }
    } catch (err) {
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/studio/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Document deleted successfully");
        mutate();
      } else {
        toast.error(data.error || "Failed to delete document");
      }
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  const handleRenameSubmit = async (
    e: React.FormEvent | React.FocusEvent,
    id: string,
    originalTitle: string
  ) => {
    e.preventDefault();
    if (!editTitle.trim() || editTitle.trim() === originalTitle) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/studio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Document renamed");
        setEditingId(null);
        mutate();
      } else {
        toast.error(data.error || "Failed to rename document");
      }
    } catch (err) {
      toast.error("Failed to rename document");
    }
  };

  return (
    <div className="h-full flex flex-col bg-app-canvas text-app-text-primary overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageHeader
          icon={<Boxes className="text-brand-primary" />}
          title="Studio"
          actions={
            <div className="flex items-center gap-2">
              {/* Desktop Search */}
              <div className="hidden md:flex items-center gap-2.5 w-64 lg:w-80 bg-app-surface-glass border border-app-border-default rounded-full px-3 py-1.5 shadow-xs">
                <Search className="size-3.5 text-app-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-app-text-primary placeholder:text-app-text-muted/60 w-full focus:ring-0 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-app-text-muted hover:text-app-text-primary outline-none"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreateNew}
                disabled={isCreating}
                className="gap-1.5 sm:gap-2 bg-brand-primary rounded-full hover:bg-brand-primary/90 transition-colors text-white border-transparent text-xs py-1.5 h-9 px-3 sm:px-4 shrink-0 shadow-sm"
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                <span className="hidden sm:inline">Create Document</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          }
        />

        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* Mobile Search Bar (Cleanly placed below header on mobile) */}
          <div className="flex md:hidden items-center gap-2.5 w-full bg-app-surface-glass border border-app-border-default rounded-full px-3.5 py-2 shadow-xs">
            <Search className="size-3.5 text-app-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-app-text-primary placeholder:text-app-text-muted/60 w-full focus:ring-0 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-app-text-muted hover:text-app-text-primary outline-none"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-app-surface border border-app-border-subtle animate-pulse p-4 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="size-9 bg-app-surface-glass rounded-full animate-pulse shrink-0" />
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
            <div className="flex flex-col items-center justify-center p-12 text-center bg-app-surface-glass border border-app-border-subtle rounded-2xl max-w-2xl mx-auto space-y-4">
              <div className="size-12 rounded-full bg-app-danger-soft border border-app-danger-border flex items-center justify-center text-app-danger-strong">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight">Failed to load documents</h3>
                <p className="text-sm text-app-text-muted mt-1">Please try refreshing the page.</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-app-surface-glass border border-app-border-subtle rounded-2xl max-w-2xl mx-auto space-y-4">
              <div className="size-12 rounded-full bg-app-surface-elevated border border-app-border-default flex items-center justify-center text-app-text-muted">
                <AlertCircle className="size-6 text-app-text-secondary" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {searchQuery ? "No matching documents" : "No documents found"}
                </h3>
                <p className="text-sm text-app-text-muted mt-1 leading-relaxed mb-4 max-w-md">
                  {searchQuery
                    ? `No documents match "${searchQuery}". Try searching for another name.`
                    : "Create documents to build resumes, slides, guides, and reports with AI assistance."}
                </p>
                <Button
                  onClick={handleCreateNew}
                  disabled={isCreating}
                  className="gap-2 bg-brand-primary rounded-full hover:bg-brand-primary/90 transition-colors text-white border-transparent text-xs py-1.5 h-9 px-4 mx-auto"
                >
                  {isCreating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Create Document
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-app-surface-glass-soft border border-app-border-subtle rounded-2xl overflow-hidden backdrop-blur-md">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-app-surface-glass border-b border-app-border-subtle text-[10px] font-bold uppercase tracking-wider text-app-text-soft">
                <div className="col-span-5">Document</div>
                <div className="col-span-4">Tags & Details</div>
                <div className="col-span-3 text-right pr-8">Created</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-app-border-subtle">
                {items.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => router.push(`/ai/studio/${item._id}`)}
                    className="group relative grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 sm:px-6 py-4 items-center hover:bg-app-surface-glass transition-all duration-200 cursor-pointer"
                  >
                    {/* Document Title & Icon */}
                    <div className="col-span-1 md:col-span-5 flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary relative overflow-hidden group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                        <FileBadge className="size-4.5 relative z-10" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {editingId === item._id ? (
                          <form
                            onSubmit={(e) =>
                              handleRenameSubmit(e, item._id, item.title)
                            }
                            className="flex items-center w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={(e) =>
                                handleRenameSubmit(e, item._id, item.title)
                              }
                              className="w-full max-w-sm bg-app-surface-glass border border-brand-primary/50 rounded-full px-3 py-1 text-xs text-app-text-primary outline-none focus:ring-1 focus:ring-brand-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </form>
                        ) : (
                          <h3 className="font-normal text-app-text-primary text-sm truncate transition-colors duration-200 tracking-tight">
                            {item.title || "Untitled Document"}
                          </h3>
                        )}
                      </div>
                    </div>

                    {/* Tags & Details */}
                    <div className="col-span-1 md:col-span-4 flex items-center gap-1.5 flex-wrap">
                      {item.tags && item.tags.length > 0 ? (
                        <>
                          {item.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="rounded-full border border-app-border-subtle bg-app-surface-glass px-2 py-0.5 text-[10px] text-app-text-soft"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="rounded-full border border-app-border-subtle bg-app-surface-glass px-2 py-0.5 text-[10px] text-app-text-soft">
                              +{item.tags.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-app-text-muted">
                          Standard Document
                        </span>
                      )}
                    </div>

                    {/* Created Date & Actions */}
                    <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-end gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-app-text-soft md:pr-2">
                        <Calendar className="size-3.5 md:hidden" />
                        {item.createdAt
                          ? format(new Date(item.createdAt), "MMM d, yyyy")
                          : "Recently"}
                      </span>

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(item._id);
                            setEditTitle(item.title);
                          }}
                          className="opacity-100 md:opacity-0 group-hover:opacity-100 p-2 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated rounded-lg transition-all duration-200 cursor-pointer outline-none shrink-0"
                          title="Rename document"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, item._id)}
                          className="opacity-100 md:opacity-0 group-hover:opacity-100 p-2 text-app-text-muted hover:text-app-danger-strong hover:bg-app-danger-soft rounded-lg transition-all duration-200 cursor-pointer outline-none shrink-0 border border-transparent hover:border-app-danger-border"
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
    </div>
  );
}


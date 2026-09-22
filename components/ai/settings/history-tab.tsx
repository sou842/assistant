"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAI } from "@/app/ai/_components/ai-provider";
import {
  MessageSquare,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Pin,
  X,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteStoredChat } from "@/lib/chat-storage";
import { formatDistanceToNow, format } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function HistoryTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { chats, setChats, removeChat, activeChatId, setActiveChatId } = useAI();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data, isLoading, mutate } = useSWR(
    `/api/chats?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchQuery)}`,
    fetcher,
    { keepPreviousData: true }
  );

  let paginatedChats: any[] = [];
  let totalPages = 1;
  let totalCount = 0;

  if (data) {
    if (data.chats) {
      paginatedChats = data.chats.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        updatedAt: new Date(c.updatedAt).getTime(),
        createdAt: c.createdAt ? new Date(c.createdAt).getTime() : undefined,
      }));
      totalPages = data.totalPages || 1;
      totalCount = data.totalCount || paginatedChats.length;
    } else if (Array.isArray(data)) {
      paginatedChats = data.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        updatedAt: new Date(c.updatedAt).getTime(),
        createdAt: c.createdAt ? new Date(c.createdAt).getTime() : undefined,
      }));
      totalPages = 1;
      totalCount = paginatedChats.length;
    }
  }

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (paginatedChats.length === 0) return;
    if (selectedIds.size === paginatedChats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedChats.map((c) => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirm = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected conversation${selectedIds.size > 1 ? "s" : ""
      }? This action cannot be undone.`
    );
    if (!confirm) return;

    setIsDeletingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      let successCount = 0;

      for (const id of ids) {
        const ok = await deleteStoredChat(id);
        if (ok) successCount++;
      }

      const newChats = chats.filter((c) => !ids.includes(c.id));
      setChats(newChats);
      setSelectedIds(new Set());

      if (ids.includes(activeChatId)) {
        if (newChats.length > 0) {
          setActiveChatId(newChats[0].id);
        } else {
          setActiveChatId("");
        }
      }

      toast.success(`Deleted ${successCount} conversation${successCount > 1 ? "s" : ""}`);
      mutate();
    } catch (error) {
      toast.error("Failed to delete some conversations");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSingleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm("Are you sure you want to delete this conversation?");
    if (!confirm) return;

    setDeletingId(id);
    try {
      await removeChat(id);
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
      toast.success("Conversation deleted");
      mutate();
    } catch (err) {
      toast.error("Failed to delete conversation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveChatId(chatId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("settings");
    const newQuery = params.toString() ? `?${params.toString()}` : "";
    router.push(`/ai/${chatId}${newQuery}`);
  };

  const isAllSelected =
    paginatedChats.length > 0 && selectedIds.size === paginatedChats.length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full w-full max-w-3xl mx-auto space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-app-border-default/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
            <MessageSquare className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-app-text-primary tracking-tight">
                Chat History
              </h2>
              {totalCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-app-surface-elevated text-app-text-secondary border border-app-border-default/25">
                  {totalCount} {totalCount === 1 ? "chat" : "chats"}
                </span>
              )}
            </div>
            <p className="text-xs text-app-text-muted mt-0.5">
              Browse, search, jump into, or bulk-manage your past conversations.
            </p>
          </div>
        </div>
      </div>

      {/* Action / Search Toolbar */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-app-text-muted transition-colors group-focus-within:text-brand-primary" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-9.5 bg-app-surface-elevated/70 border border-app-border-default/20 rounded-xl pl-10 pr-9 py-1.5 text-[13px] text-app-text-primary placeholder:text-app-text-muted/70 focus:outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-app-text-muted hover:text-app-text-primary rounded-full transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {paginatedChats.length > 0 && (
          <button
            type="button"
            onClick={selectAll}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9.5 rounded-xl text-xs font-medium border transition-all cursor-pointer select-none",
              isAllSelected
                ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary"
                : "bg-app-surface-elevated/60 border-app-border-default/20 text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated"
            )}
          >
            {isAllSelected ? (
              <CheckSquare className="size-3.5 text-brand-primary" />
            ) : (
              <Square className="size-3.5 text-app-text-muted" />
            )}
            <span className="hidden sm:inline">
              {isAllSelected ? "Deselect All" : "Select All"}
            </span>
          </button>
        )}

        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isDeletingBulk}
            className="inline-flex items-center gap-1.5 px-3.5 h-9.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none shrink-0"
          >
            {isDeletingBulk ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            <span>Delete ({selectedIds.size})</span>
          </button>
        )}
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[280px] max-h-[calc(70vh-190px)]">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 p-3 rounded-xl border border-app-border-default/15 bg-app-surface-elevated/20 animate-pulse"
            >
              <div className="size-4.5 rounded-md bg-app-surface-glass shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-app-surface-glass rounded-md w-3/5" />
                <div className="h-3 bg-app-surface-glass rounded-md w-1/4" />
              </div>
              <div className="w-14 h-7 rounded-lg bg-app-surface-glass shrink-0" />
            </div>
          ))
        ) : paginatedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center border border-dashed border-app-border-default/20 rounded-2xl bg-app-surface-elevated/10">
            <div className="p-3 rounded-2xl bg-app-surface-elevated/60 text-app-text-muted mb-2.5 border border-app-border-default/20">
              {searchQuery ? <Search className="size-5 text-app-text-muted" /> : <Inbox className="size-5 text-app-text-muted" />}
            </div>
            <h3 className="text-sm font-medium text-app-text-primary">
              {searchQuery ? "No matching chats found" : "No conversation history"}
            </h3>
            <p className="text-xs text-app-text-muted mt-1 max-w-sm">
              {searchQuery
                ? `No conversations match "${searchQuery}". Try a different keyword.`
                : "Start chatting with Jarvis and your saved conversations will appear here."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3.5 px-3 py-1.5 text-xs font-medium bg-app-surface-elevated hover:bg-app-surface-elevated/80 text-app-text-primary rounded-lg border border-app-border-default/30 transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          paginatedChats.map((chat) => {
            const isSelected = selectedIds.has(chat.id);
            const isActive = chat.id === activeChatId;
            const isDeleting = deletingId === chat.id;

            return (
              <div
                key={chat.id}
                onClick={() => toggleSelection(chat.id)}
                className={cn(
                  "group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none",
                  isSelected
                    ? "border-brand-primary/40 bg-brand-primary/5 shadow-xs"
                    : isActive
                      ? "border-brand-primary/30 bg-app-surface-elevated/80 shadow-xs"
                      : "border-app-border-default/15 bg-app-surface-elevated/30 hover:bg-app-surface-elevated/70 hover:border-app-border-default/35"
                )}
              >
                {/* Left Selection Checkbox */}
                <button
                  type="button"
                  onClick={(e) => toggleSelection(chat.id, e)}
                  className="shrink-0 p-1 -m-1 rounded-md text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
                  title={isSelected ? "Deselect" : "Select"}
                >
                  {isSelected ? (
                    <CheckSquare className="size-4 text-brand-primary" />
                  ) : (
                    <Square className="size-4 text-app-text-muted/60 group-hover:text-app-text-muted transition-colors" />
                  )}
                </button>

                {/* Main Chat Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-app-text-primary truncate tracking-tight">
                      {chat.title || "Untitled Conversation"}
                    </p>
                    {chat.isPinned && (
                      <span className="shrink-0 text-amber-400" title="Pinned conversation">
                        <Pin className="size-3 fill-amber-400/30" />
                      </span>
                    )}
                    {isActive && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/15 text-brand-primary border border-brand-primary/20">
                        <span className="size-1 rounded-full bg-brand-primary animate-pulse" />
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-app-text-muted">
                    <span className="flex items-center gap-1" title={format(chat.updatedAt, "PPpp")}>
                      <Clock className="size-3 text-app-text-muted/70" />
                      {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenChat(chat.id, e)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-app-text-secondary hover:text-app-text-primary bg-app-surface-elevated/40 hover:bg-app-surface-elevated border border-app-border-default/20 hover:border-app-border-default/40 transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                    title="Open conversation"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="size-3" />
                  </button>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={(e) => handleSingleDelete(chat.id, e)}
                    className="p-1.5 text-app-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 cursor-pointer"
                    title="Delete conversation"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2.5 border-t border-app-border-default/15 shrink-0 text-xs text-app-text-muted">
          <div>
            Showing <span className="font-medium text-app-text-primary">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
            <span className="font-medium text-app-text-primary">
              {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
            </span>{" "}
            of <span className="font-medium text-app-text-primary">{totalCount}</span> chats
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-app-surface-elevated text-app-text-muted hover:text-app-text-primary border border-app-border-default/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 py-1 text-xs font-medium text-app-text-primary bg-app-surface-elevated rounded-md border border-app-border-default/20">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-app-surface-elevated text-app-text-muted hover:text-app-text-primary border border-app-border-default/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

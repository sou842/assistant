"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAI } from "@/app/ai/_components/ai-provider";
import { MessageCircle, Trash2, CheckSquare, Square, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteStoredChat } from "@/lib/chat-storage";
import { formatDistanceToNow } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function HistoryTab() {
  const { chats, setChats, removeChat, activeChatId, setActiveChatId } = useAI();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { data, isLoading, mutate } = useSWR(
    `/api/chats?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchQuery)}`,
    fetcher,
    { keepPreviousData: true }
  );

  let paginatedChats: any[] = [];
  let totalPages = 1;

  if (data) {
    if (data.chats) {
      paginatedChats = data.chats.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        updatedAt: new Date(c.updatedAt).getTime()
      }));
      totalPages = data.totalPages;
    } else {
      paginatedChats = data.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        updatedAt: new Date(c.updatedAt).getTime()
      }));
      totalPages = 1;
    }
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === paginatedChats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedChats.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const confirm = window.confirm(`Are you sure you want to delete ${selectedIds.size} chat${selectedIds.size > 1 ? 's' : ''}?`);
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
      
      if (ids.includes(activeChatId) && newChats.length > 0) {
         setActiveChatId(newChats[0].id);
      }
      
      toast.success(`Deleted ${successCount} chat${successCount > 1 ? "s" : ""}`);
      mutate();
    } catch (error) {
      toast.error("Failed to delete some chats");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSingleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm("Are you sure you want to delete this chat?");
    if (!confirm) return;
    
    await removeChat(id);
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
    mutate();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col max-h-[calc(100vh-140px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-app-text-primary">Chat History</h2>
          <p className="text-sm text-app-text-muted mt-1">Manage and review your past conversations.</p>
        </div>
        
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isDeletingBulk}
            className="flex items-center gap-2 px-4 py-2 bg-app-danger-soft text-app-danger-strong hover:bg-app-danger hover:text-white rounded-full cursor-pointer text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isDeletingBulk ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete Selected ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-app-text-ghost" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-app-surface border border-app-border-default rounded-full pl-10 pr-4 py-2 text-sm text-app-text-primary placeholder:text-app-text-ghost focus:outline-none focus:border-brand-primary/50 transition-colors"
          />
        </div>
        
        <button
          onClick={selectAll}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-app-text-secondary hover:text-app-text-primary transition-colors whitespace-nowrap cursor-pointer"
        >
          {selectedIds?.size === paginatedChats?.length && paginatedChats?.length > 0 ? (
            <CheckSquare className="size-4 text-brand-primary" />
          ) : (
            <Square className="size-4" />
          )}
          Select All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {isLoading ? (
          Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded border border-app-border-default bg-app-surface/50 animate-pulse">
              <div className="shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded bg-app-surface-glass" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-app-surface-glass shrink-0" />
                  <div className="h-4 bg-app-surface-glass rounded w-2/3" />
                </div>
                <div className="h-3 bg-app-surface-glass rounded w-1/4 ml-6" />
              </div>
            </div>
          ))
        ) : paginatedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed border-app-border-default rounded-xl">
            <p className="text-app-text-muted text-sm">No chats found.</p>
          </div>
        ) : (
          paginatedChats.map((chat) => {
            const isSelected = selectedIds.has(chat.id);
            return (
              <div
                key={chat.id}
                onClick={() => toggleSelection(chat.id)}
                className={cn(
                  "group flex items-start gap-4 p-3 rounded border transition-all cursor-pointer hover:bg-app-surface-glass",
                  isSelected 
                    ? "border-brand-primary bg-brand-primary/5" 
                    : "border-app-border-default bg-app-surface/50"
                )}
              >
                <div className="shrink-0">
                  {isSelected ? (
                    <CheckSquare className="size-5 text-brand-primary" />
                  ) : (
                    <Square className="size-5 text-app-text-ghost group-hover:text-app-text-muted transition-colors" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-brand-primary shrink-0" />
                    <p className="text-sm font-medium text-app-text-primary truncate">
                      {chat.title || "Untitled Chat"}
                    </p>
                  </div>
                  <p className="text-xs text-app-text-muted mt-1 ml-6">
                    {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                
                <button
                  onClick={(e) => handleSingleDelete(chat.id, e)}
                  className="p-2 text-app-text-ghost hover:text-app-danger hover:bg-app-danger-soft rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete chat"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 shrink-0">
          <p className="text-sm text-app-text-muted">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-full hover:bg-app-surface border border-app-border-default text-app-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full hover:bg-app-surface border border-app-border-default text-app-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

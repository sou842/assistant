"use client";

import React, { useState } from "react";
import { Database, Menu, Search, Plus, FileText, Table2, Trash2, ChevronDown, Image as ImageIcon } from "lucide-react";
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item deleted");
        mutate();
      } else {
        toast.error("Failed to delete item");
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/25" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vault..."
              className="h-9 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-4 text-xs outline-none focus:border-white/20 transition-all"
            />
          </div>
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              className="h-9 px-4 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              {filterType === "all" ? "All Types" : filterType === "note" ? "Notes" : filterType === "spreadsheet" ? "Spreadsheets" : filterType === "gallery" ? "Media Galleries" : "Albums"}
              <ChevronDown size={14} className="opacity-40" />
            </button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-[#0F0F0F] border border-white/10 rounded-xl w-48 mt-2">
              <li>
                <button 
                  onClick={() => setFilterType("all")}
                  className={cn("text-xs py-2", filterType === "all" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
                >
                  All Types
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setFilterType("note")}
                  className={cn("text-xs py-2", filterType === "note" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
                >
                  Notes
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setFilterType("spreadsheet")}
                  className={cn("text-xs py-2", filterType === "spreadsheet" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
                >
                  Spreadsheets
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setFilterType("gallery")}
                  className={cn("text-xs py-2", filterType === "gallery" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
                >
                  Media Galleries
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setFilterType("album")}
                  className={cn("text-xs py-2", filterType === "album" ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5")}
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
              <div className="size-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-400">Failed to load vault items.</div>
          ) : items.length === 0 ? (
            <div className="min-h-[400px] rounded-3xl border border-dashed border-white/10 bg-[#050505] flex flex-col items-center justify-center text-center px-6">
              <div className="size-16 rounded-3xl bg-white/3 border border-white/10 flex items-center justify-center mb-5">
                <Database className="size-7 text-white/25" />
              </div>
              <h2 className="text-xl font-semibold">Vault is empty</h2>
              <p className="max-w-md mt-3 text-sm leading-7 text-white/35">
                Create a note or spreadsheet, or ask Jarvis to save data for you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item: any) => (
                <div
                  key={item._id}
                  onClick={() => handleEdit(item)}
                  className="group relative flex flex-col p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-full bg-white/5">
                      {item.type === 'note' ? (
                        <FileText size={24} className="text-blue-400" />
                      ) : item.type === 'spreadsheet' ? (
                        <Table2 size={24} className="text-green-400" />
                      ) : (
                        <ImageIcon size={24} className={item.type === 'album' ? "text-pink-400" : "text-purple-400"} />
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, item._id)}
                      className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 className="font-semibold text-white truncate mb-1">{item.title}</h3>
                  <div className="text-xs text-white/40 mb-4 flex items-center gap-2">
                    <span className="capitalize">{item.type}</span>
                    <span>•</span>
                    <span>{format(new Date(item.updatedAt), 'MMM d, yyyy')}</span>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-4 border-t border-white/5">
                      {item.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/50 border border-white/5">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/50 border border-white/5">
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
        <div className="dropdown dropdown-top dropdown-end">
          <button
            tabIndex={0}
            className="size-14 rounded-full bg-white text-black shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-[#0F0F0F] border border-white/10 rounded-xl w-48 mb-4">
            <li>
              <button onClick={() => handleCreate("note")} className="flex items-center gap-3 py-3 text-sm hover:bg-white/5 transition text-white">
                <FileText size={18} className="text-blue-400" />
                New Note
              </button>
            </li>
            <li>
              <button onClick={() => handleCreate("spreadsheet")} className="flex items-center gap-3 py-3 text-sm hover:bg-white/5 transition text-white">
                <Table2 size={18} className="text-green-400" />
                New Spreadsheet
              </button>
            </li>
            <li>
              <button onClick={() => handleCreate("album")} className="flex items-center gap-3 py-3 text-sm hover:bg-white/5 transition text-white">
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

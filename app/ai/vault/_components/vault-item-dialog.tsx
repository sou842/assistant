"use client";

import React, { useEffect, useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { NoteEditor } from "./note-editor";
import { SpreadsheetEditor } from "./spreadsheet-editor";

interface VaultItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string; // If undefined, we are creating a new item
  type: "note" | "spreadsheet";
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function VaultItemDialog({ isOpen, onClose, itemId, type }: VaultItemDialogProps) {
  const isNew = !itemId;
  
  const { data, error, isLoading } = useSWR(
    itemId ? `/api/vault/${itemId}` : null,
    fetcher
  );

  const [title, setTitle] = useState("Untitled Item");
  const [content, setContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state when data loads for editing
  useEffect(() => {
    if (data?.item) {
      setTitle(data.item.title);
      setContent(data.item.content);
    } else if (isNew) {
      setTitle(type === 'note' ? 'New Note' : 'New Spreadsheet');
      // Set empty initial content based on type
      setContent(type === 'spreadsheet' ? [] : {});
    }
  }, [data, isNew, type]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title,
        type,
        content,
        // Optional tags could be added here
      };

      const url = isNew ? "/api/vault" : `/api/vault/${itemId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isNew ? "Item created" : "Item updated");
        onClose();
      } else {
        toast.error("Failed to save item");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full h-full max-w-6xl bg-[#0F0F0F] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0F0F0F] shrink-0">
          <div className="flex-1 flex items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none text-lg font-semibold text-white outline-none w-full max-w-md placeholder:text-white/20"
              placeholder="Enter title..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || (isLoading && !isNew)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition cursor-pointer"
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto bg-[#070707] relative">
          {(isLoading && !isNew) || (!isNew && content === null) ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-400">
              Failed to load data
            </div>
          ) : (
            <div className="h-full w-full">
              {type === "note" ? (
                <NoteEditor 
                  key={itemId || "new"}
                  initialData={content} 
                  onChange={setContent} 
                />
              ) : (
                <SpreadsheetEditor 
                  key={itemId || "new"}
                  initialData={content} 
                  onChange={setContent} 
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

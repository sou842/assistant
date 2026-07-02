"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { X, ExternalLink, FileText, Table2, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";

const NoteEditor = dynamic(
  () => import("@/app/ai/vault/_components/note-editor").then(mod => mod.NoteEditor),
  { ssr: false }
);

const SpreadsheetEditor = dynamic(
  () => import("@/app/ai/vault/_components/spreadsheet-editor").then(mod => mod.SpreadsheetEditor),
  { ssr: false }
);

const GalleryViewer = dynamic(
  () => import("@/app/ai/vault/_components/gallery-viewer").then(mod => mod.GalleryViewer),
  { ssr: false }
);

const AlbumBookViewer = dynamic(
  () => import("@/app/ai/vault/_components/album-book-viewer").then(mod => mod.AlbumBookViewer),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

interface VaultItemSidePanelProps {
  itemId: string;
  onClose: () => void;
}

export function VaultItemSidePanel({ itemId, onClose }: VaultItemSidePanelProps) {
  const { data, error, isLoading, mutate } = useSWR(
    itemId ? `/api/vault/${itemId}` : null,
    fetcher
  );

  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    if (data?.item) {
      setContent(data.item.content);
    }
  }, [data]);

  const item = data?.item;
  const isError = error || (!isLoading && !item);

  return (
    <div className="flex flex-col h-full backdrop-blur-xl border-l border-app-border-subtle w-full bg-app-surface shadow-2xl">
      {/* Panel Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-app-surface flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center size-8 rounded-lg bg-app-surface-glass-strong text-app-text-primary shrink-0">
            {item?.type === "spreadsheet" ? <Table2 size={16} className="text-[#0F9D58]" /> :
             item?.type === "gallery" || item?.type === "album" ? <ImageIcon size={16} className="text-[#A142F4]" /> :
             <FileText size={16} className="text-[#4285F4]" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-app-text-primary truncate">
              {item?.title || (isLoading ? "Loading..." : "Unknown Item")}
            </span>
            {/* <span className="text-xs text-app-text-muted capitalize">
              {item?.type || "Document"}
            </span> */}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/ai/vault/${itemId}`} target="_blank">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 rounded-full text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass"
              title="Open in Full Page"
            >
              <ExternalLink size={14} />
              <span className="text-xs font-medium hidden sm:inline-block">Open</span>
            </Button>
          </Link>
          <div className="w-px h-4 bg-app-border-default mx-1"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass transition-colors"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-app-text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-medium">Loading vault item...</p>
          </div>
        ) : isError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-app-text-primary mb-1">Failed to load item</p>
            <p className="text-xs text-app-text-muted">It may have been deleted or is unavailable.</p>
          </div>
        ) : (
          <div className="w-full h-full p-4">
            {item.type === "note" ? (
              <NoteEditor
                key={`${itemId}-${item.updatedAt}`}
                initialData={item.content}
                onChange={setContent}
                readOnly={true}
              />
            ) : item.type === "spreadsheet" ? (
              <SpreadsheetEditor
                key={`${itemId}-${item.updatedAt}`}
                initialData={item.content}
                onChange={setContent}
                readOnly={true}
              />
            ) : item.type === "album" ? (
              <AlbumBookViewer
                item={item}
                readOnly={true}
              />
            ) : (
              <GalleryViewer
                key={`${itemId}-${item.updatedAt}`}
                initialData={item.content}
                onChange={setContent}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

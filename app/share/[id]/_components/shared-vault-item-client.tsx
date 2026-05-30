"use client";

import useSWR from "swr";
import { FileText, Table2, Image as ImageIcon } from "lucide-react";
import { NoteEditor } from "@/app/ai/vault/_components/note-editor";
import { SpreadsheetEditor } from "@/app/ai/vault/_components/spreadsheet-editor";
import { GalleryViewer } from "@/app/ai/vault/_components/gallery-viewer";

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  });

export default function SharedVaultItemClient({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(id ? `/api/share/${id}` : null, fetcher)

  if (error) {
    return (
      <div className="flex-1 flex h-screen flex-col items-center justify-center p-10 bg-app-surface text-app-text-primary">
        <h1 className="text-2xl font-bold mb-4">Item Not Found</h1>
        <p className="mb-4 text-app-text-secondary">This item may not exist or is no longer public.</p>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-surface">
        <div className="size-8 rounded-full border-2 border-app-border-default border-t-app-text-primary animate-spin" />
      </div>
    )
  }

  const item = data.item

  return (
    <div className="flex h-screen flex-col bg-app-surface text-app-text-primary">
      <header className="sticky top-0 z-30 h-16 w-full shrink-0 border-b border-app-border-default bg-app-canvas/70 backdrop-blur-xl">
        <div className="mx-auto max-w-8xl px-5 h-full">
          <div className="flex items-center gap-4 h-full">
            <div className="size-9 shrink-0 rounded-xl border border-app-border-default bg-app-surface-glass flex items-center justify-center">
              {item.type === "note" ? <FileText className="size-4 text-indigo-200" /> : item.type === "spreadsheet" ? <Table2 className="size-4 text-indigo-200" /> : <ImageIcon className="size-4 text-indigo-200" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-medium tracking-tight">{item.title}</h1>
              <p className="truncate text-xs text-app-text-faint">Shared Vault Item</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-y-auto bg-app-canvas">
          <div className="h-full w-full">
            {item.type === "note" ? (
              <NoteEditor
                key={`${item._id}-${item.updatedAt}`}
                initialData={item.content}
                onChange={() => {}}
                readOnly={true}
              />
            ) : item.type === "spreadsheet" ? (
              <SpreadsheetEditor
                key={`${item._id}-${item.updatedAt}`}
                initialData={item.content}
                onChange={() => {}}
                readOnly={true}
              />
            ) : (
              <GalleryViewer
                key={`${item._id}-${item.updatedAt}`}
                initialData={item.content}
                onChange={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

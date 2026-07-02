"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Trash2, FileText, GripVertical, ImageIcon, Upload, Link as LinkIcon, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { NoteEditor } from "./note-editor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function SortablePageItem({ page, isActive, onClick, onDelete, onRename }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(page.title);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center justify-between p-2 rounded-full cursor-pointer mb-1 border border-transparent",
        isActive ? "bg-app-surface-glass-strong border-app-accent/20" : "hover:bg-app-surface-glass"
      )}
      onClick={() => {
        if (!isEditing) onClick();
      }}
    >
      <div className="flex items-center flex-1 gap-2 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab flex items-center justify-center relative w-5 h-5 text-app-text-faint hover:text-app-text-primary shrink-0">
          <GripVertical size={14} className="opacity-0 group-hover:opacity-100 absolute transition-opacity" />
          <FileText size={16} className={cn("opacity-100 group-hover:opacity-0 absolute transition-opacity", isActive ? "text-app-accent" : "text-app-text-muted")} />
        </div>

        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              if (title !== page.title) onRename(page._id, title);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsEditing(false);
                if (title !== page.title) onRename(page._id, title);
              }
            }}
            autoFocus
            className="h-7 text-xs px-1 flex-1 bg-background"
          />
        ) : (
          <span
            className="text-sm truncate flex-1 text-app-text-primary"
            onDoubleClick={() => setIsEditing(true)}
          >
            {page.title}
          </span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(page._id); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-400/20 rounded-full transition-opacity cursor-pointer"
        title="Delete Page"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

interface AlbumBookViewerProps {
  item: any;
  readOnly?: boolean;
  isShared?: boolean;
}

export function AlbumBookViewer({ item, readOnly = false, isShared = false }: AlbumBookViewerProps) {
  const initialPages = useMemo(() => {
    if (!item?.content || !Array.isArray(item.content)) return [];
    return item.content.map((p: any) =>
      typeof p === 'string' ? { _id: p, title: 'Untitled Page' } : { _id: p.pageId, title: p.title }
    );
  }, [item?.content]);

  const [pages, setPages] = useState<any[]>(initialPages);
  const [activePageId, setActivePageId] = useState<string | null>(initialPages.length > 0 ? initialPages[0]._id : null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: activePageData, mutate, isLoading: isActivePageLoading } = useSWR(
    activePageId ? (isShared ? `/api/share/${item._id}/pages/${activePageId}` : `/api/vault/${item._id}/pages/${activePageId}`) : null,
    fetcher
  );

  // Cover Image States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverLinkUrl, setCoverLinkUrl] = useState("");
  const [isAddingPage, setIsAddingPage] = useState(false);

  const activePage = useMemo(() => {
    const basePage = pages?.find(p => p._id === activePageId);
    if (!basePage) return null;
    if (activePageData?.page) {
      return { ...basePage, ...activePageData.page };
    }
    return basePage;
  }, [pages, activePageId, activePageData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddPage = async () => {
    if (isAddingPage) return;
    setIsAddingPage(true);
    try {
      const res = await fetch(`/api/vault/${item._id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Page" })
      });
      if (!res.ok) throw new Error("Failed to add page");
      const { page } = await res.json();
      setPages([...pages, page]);
      setActivePageId(page._id);
      toast.success("Page added");
    } catch (err) {
      toast.error("Error adding page");
    } finally {
      setIsAddingPage(false);
    }
  };

  const handleUpdateCover = async (url: string | null) => {
    if (!activePageId) return;
    try {
      setPages(pages.map(p => p._id === activePageId ? { ...p, coverImage: url } : p));
      await fetch(`/api/vault/${item._id}/pages/${activePageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url })
      });
      toast.success(url ? "Cover image updated" : "Cover image removed");
      setIsCoverDialogOpen(false);
      setCoverLinkUrl("");
    } catch (err) {
      toast.error("Failed to update cover image");
      mutate();
    }
  };

  const handleLinkCover = () => {
    if (coverLinkUrl.trim()) handleUpdateCover(coverLinkUrl.trim());
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isCover", "true");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const result = await uploadRes.json();
      await handleUpdateCover(result.url);
    } catch (error) {
      toast.error("Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      await fetch(`/api/vault/${item._id}/pages/${pageId}`, { method: "DELETE" });
      const newPages = pages.filter(p => p._id !== pageId);
      setPages(newPages);
      if (activePageId === pageId) {
        setActivePageId(newPages.length > 0 ? newPages[0]._id : null);
      }
      toast.success("Page deleted");
    } catch (err) {
      toast.error("Error deleting page");
    }
  };

  const handleRenamePage = async (pageId: string, newTitle: string) => {
    try {
      setPages(pages?.map(p => p._id === pageId ? { ...p, title: newTitle } : p));
      await fetch(`/api/vault/${item._id}/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
    } catch (err) {
      toast.error("Error renaming page");
      mutate();
    }
  };

  const handleContentChange = (content: any) => {
    if (!activePageId || readOnly) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/vault/${item._id}/pages/${activePageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        });
      } catch (err) {
        console.error("Failed to auto-save page content", err);
      }
    }, 1000);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex(p => p._id === active.id);
      const newIndex = pages.findIndex(p => p._id === over.id);
      const newPages = arrayMove(pages, oldIndex, newIndex);
      setPages(newPages);

      if (!readOnly && !isShared) {
        try {
          const pageObjects = newPages.map(p => ({ pageId: p._id, title: p.title }));
          await fetch(`/api/vault/${item._id}/pages/reorder`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pages: pageObjects })
          });
        } catch (err) {
          toast.error("Failed to save page order");
        }
      }
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar for pages */}
      <div className="w-64 border-r flex flex-col bg-app-surface-glass shrink-0">
        <div className="flex-1 overflow-y-auto p-2">
          {pages?.length === 0 ? (
            <div className="text-center text-xs text-app-text-muted mt-10">No pages yet</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pages?.map(p => p._id)} strategy={verticalListSortingStrategy}>
                {pages?.map((page) => (
                  <SortablePageItem
                    key={page?._id}
                    page={page}
                    isActive={activePageId === page._id}
                    onClick={() => setActivePageId(page._id)}
                    onDelete={handleDeletePage}
                    onRename={handleRenamePage}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

        <Button
          onClick={handleAddPage}
          disabled={isAddingPage}
          size="sm"
          variant="ghost"
          className="w-full mt-2 p-4 rounded-full border border-app-surface-glass hover:bg-app-surface-glass! text-xs text-app-accent hover:text-app-accent hover:bg-app-accent/10">
          {isAddingPage ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Plus size={16} />} 
          {isAddingPage ? "Adding..." : "Add Page"}
        </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto relative bg-background min-w-0">
        {activePage ? (
          <div className="h-full flex flex-col relative group">
            {activePage.coverImage && (
              <div className="w-full h-48 bg-app-surface-glass-strong border-b relative group/cover shrink-0">
                <img src={activePage.coverImage} alt="Cover" className="w-full h-full object-cover" />
                {!readOnly && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" onClick={() => setIsCoverDialogOpen(true)} className="h-8 rounded-full">
                      Edit Cover
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!readOnly && !activePage.coverImage && (
              <Button
                variant="ghost"
                onClick={() => setIsCoverDialogOpen(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-2 z-40 bg-app-surface-glass hover:bg-app-surface-glass! text-app-text-muted hover:text-app-text-primary h-8 px-3 rounded-full"
              >
                <ImageIcon size={14} className="mr-0" />
                Add Cover
              </Button>
            )}
            <div className="flex-1 p-4 relative">
              {isActivePageLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-app-text-muted" />
                </div>
              ) : (
                <NoteEditor
                  key={activePage._id}
                  initialData={activePage.content}
                  onChange={handleContentChange}
                  readOnly={readOnly}
                />
              )}
            </div>

            <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
              <DialogContent className="sm:max-w-md bg-app-surface-elevated border-app-border-default shadow-2xl rounded-2xl p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight text-app-text-primary">Cover Image</DialogTitle>
                  <DialogDescription className="text-sm text-app-text-muted">
                    Upload an image or paste a link to set the cover for this page.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="link" className="w-full mt-2">
                  <TabsList className="grid w-full grid-cols-2 bg-app-surface-glass rounded-full p-0.5 h-auto">
                    <TabsTrigger value="link" className="rounded-full py-1.5 text-sm font-medium data-[state=active]:bg-app-surface-elevated data-[state=active]:text-app-text-primary data-[state=active]:shadow-sm transition-all cursor-pointer">Link</TabsTrigger>
                    <TabsTrigger value="upload" className="rounded-full py-1.5 text-sm font-medium data-[state=active]:bg-app-surface-elevated data-[state=active]:text-app-text-primary data-[state=active]:shadow-sm transition-all cursor-pointer">Upload</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4 focus-visible:outline-none">
                    <div
                      onClick={() => !isUploadingCover && fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center border-2 border-dashed border-app-border-default rounded-xl p-8 transition-colors ${isUploadingCover ? 'opacity-50 cursor-not-allowed' : 'hover:bg-app-surface-glass hover:border-brand-primary/50 cursor-pointer'}`}
                    >
                      <ImageIcon size={32} className="text-app-text-ghost mb-3" />
                      <p className="text-sm font-medium text-app-text-primary">{isUploadingCover ? "Uploading..." : "Click to select a file"}</p>
                      <p className="text-xs text-app-text-muted mt-1">PNG, JPG, or WebP</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="link" className="mt-4 focus-visible:outline-none">
                    <div className="flex flex-col gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-app-text-secondary pl-1 uppercase tracking-wider">Image URL</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Link2 size={16} className="text-app-text-ghost group-focus-within:text-brand-primary/60 transition-colors" />
                          </div>
                          <input
                            type="url"
                            placeholder="Paste an image link here..."
                            value={coverLinkUrl}
                            onChange={(e) => setCoverLinkUrl(e.target.value)}
                            className="w-full bg-app-surface-glass-strong border border-app-border-default hover:border-app-border-hover rounded-xl pl-10 pr-4 h-11 text-sm text-app-text-primary outline-none focus:bg-app-surface-elevated focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all shadow-sm placeholder:text-app-text-ghost"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleLinkCover();
                            }}
                          />
                        </div>
                      </div>
                      {coverLinkUrl.trim() && <Button
                        onClick={handleLinkCover}
                        disabled={!coverLinkUrl.trim()}
                        className="w-full h-11 rounded-full bg-app-primary hover:text-app-text-primary hover:bg-brand-primary/90 transition-all shadow-sm font-medium hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      >
                        Save
                      </Button>}
                    </div>
                  </TabsContent>
                </Tabs>

                {activePage?.coverImage && (
                  <div className="mt-6 flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2.5 pl-1">
                      <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <ImageIcon size={14} className="text-red-500/70" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-app-text-primary">Current Cover</span>
                        <span className="text-xs text-app-text-muted">Will be removed instantly</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdateCover(null)}
                      className="rounded-xl text-red-500 hover:bg-red-500/50!"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <input type="file" ref={fileInputRef} onChange={handleUploadCover} accept="image/*" className="hidden" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-app-text-muted">
            Select or create a page to start reading
          </div>
        )}
      </div>
    </div>
  );
}

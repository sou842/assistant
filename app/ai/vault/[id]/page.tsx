"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2, FileText, Table2, Image as ImageIcon, Share2, Copy, MoreHorizontal, EllipsisVertical, AlertCircle, Sparkles, Bot, Link2, Loader2, Download, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { downloadVaultItem } from "@/lib/download-vault-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoteEditor } from "../_components/note-editor";
import { SpreadsheetEditor } from "../_components/spreadsheet-editor";
import { GalleryViewer } from "../_components/gallery-viewer";
import { PageHeader } from "../../_components/page-header";
import { useAI } from "../../_components/ai-provider";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { VaultChatSidePanel } from "../_components/vault-chat-side-panel";
import { motion, AnimatePresence } from "motion/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export default function VaultItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/vault/${id}` : null,
    fetcher
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [coverLinkUrl, setCoverLinkUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleLinkCover = async () => {
    if (!coverLinkUrl.trim()) return;
    try {
      await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: coverLinkUrl.trim() }),
      });
      mutate();
      toast.success("Cover image updated");
      setIsCoverDialogOpen(false);
      setCoverLinkUrl("");
    } catch (err) {
      toast.error("Failed to update cover image");
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isCover", "true");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();

      if (result.success && result.url) {
        await fetch(`/api/vault/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverImage: result.url }),
        });
        mutate();
        toast.success("Cover image updated");
        setIsCoverDialogOpen(false);
      }
    } catch (err) {
      toast.error("Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCover = async () => {
    try {
      await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: null }),
      });
      mutate();
      toast.success("Cover image removed");
      setIsCoverDialogOpen(false);
    } catch (err) {
      toast.error("Failed to remove cover image");
    }
  };
  const { memories, selectedModel, setSelectedModel } = useAI();

  const chat = useChat({
    id: `vault-item-${id}`,
    initialMessages: [],
    onFinish: ({ message }) => {
      mutate();
    },
    onError: (err) => {
      console.error("Chat error:", err);
      toast.error("Chat request failed");
    },
  });

  const { messages, status, regenerate } = chat;
  const sendMessage = (chat as any).sendMessage || (chat as any).append;
  const isChatLoading = status === "submitted" || status === "streaming";

  const sendMessageWithContext = async (payload: any, options?: any) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    const itemContext = data?.item ? `
CURRENT ITEM CONTEXT:
ID: ${id}
Type: ${data.item.type}
Title: ${data.item.title}
Tags: ${data.item.tags?.join(", ") || "None"}
Content: ${JSON.stringify(data.item.content, null, 2)}
` : "";

    await sendMessage(payload, {
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, an AI assistant integrated into a Vault item viewer. 
The user is currently viewing and working on the item provided in the CURRENT ITEM CONTEXT below.

CRITICAL INSTRUCTION: If the user asks to "update", "format", "edit", or refers to "this", "the note", "the file", or the content of the file, they are ALWAYS referring to THIS specific item.
DO NOT ask them to clarify which file they are referring to. DO NOT offer to create a new note unless explicitly asked.
Use the provided ID and content to perform the requested actions immediately using your tools.

${itemContext}`,
      },
    });
  };

  const regenerateWithContext = (options?: any) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    const itemContext = data?.item ? `
CURRENT ITEM CONTEXT:
ID: ${id}
Type: ${data.item.type}
Title: ${data.item.title}
Tags: ${data.item.tags?.join(", ") || "None"}
Content: ${JSON.stringify(data.item.content, null, 2)}
` : "";

    regenerate({
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, an AI assistant integrated into a Vault item viewer. 
The user is currently viewing and working on the item provided in the CURRENT ITEM CONTEXT below.

CRITICAL INSTRUCTION: If the user asks to "update", "format", "edit", or refers to "this", "the note", "the file", or the content of the file, they are ALWAYS referring to THIS specific item.
DO NOT ask them to clarify which file they are referring to. DO NOT offer to create a new note unless explicitly asked.
Use the provided ID and content to perform the requested actions immediately using your tools.

${itemContext}`,
      },
    });
  };

  const handleClearChat = () => {
    chat.setMessages([]);
  };

  useEffect(() => {
    if (data?.item) {
      setTitle(data.item.title);
      setContent(data.item.content);
    }
  }, [data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        toast.success("Item updated");
        mutate();
        setIsEditing(false);
      } else {
        toast.error("Failed to save item");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleTogglePublic = async (checked: boolean) => {
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: checked }),
      });

      if (res.ok) {
        toast.success(checked ? "Item is now public" : "Item is now private");
        mutate();
      } else {
        toast.error("Failed to update sharing settings");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item deleted");
        router.push("/ai/vault");
      } else {
        toast.error("Failed to delete item");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleDownload = async () => {
    await downloadVaultItem(data?.item);
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <div className="flex flex-col items-center text-center max-w-lg p-8">
          <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-app-danger-strong">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-medium text-app-text-primary mb-2">Failed to load item</h3>
          <p className="text-sm text-app-text-secondary mb-6">
            We couldn't retrieve this item from the vault. It might have been deleted or you may not have permission to access it.
          </p>
          <Link
            href="/ai/vault"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-app-surface-glass-strong text-sm font-medium text-app-text-primary hover:bg-app-surface-hover transition-colors"
          >
            Back to Vault
          </Link>
        </div>
      </div>
    );
  }

  const item = data?.item;
  const isEditorRequired = data?.item?.type === 'note' || data?.item?.type === 'spreadsheet'

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-app-surface relative">
      <div className="flex h-full flex-1 flex-col min-w-0 relative z-10">
        <PageHeader
          backHref="/ai/vault"
          icon={item?.type === "note" ? <FileText /> : item?.type === "spreadsheet" ? <Table2 /> : <ImageIcon />}
          title={
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full max-w-md border-none bg-transparent px-0 text-base font-medium text-app-text-primary outline-none placeholder:text-app-text-ghost"
              placeholder="Enter title..."
              readOnly={!isEditing}
            />
          }
          subtitle={"Manage the files here"}
          actions={
            <div className="flex items-center gap-1.5">
              {isEditorRequired && !isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="rounded-full text-xs h-8 min-w-[64px]"
                  title="Edit item"
                >
                  Edit
                </Button>
              )}
              {isEditorRequired && isEditing && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="rounded-full text-xs h-8 min-w-[64px]"
                  title="Save changes"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={12} className="mr-1.5 animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              )}

              {/* More Options Dropdown */}
              {isEditorRequired &&
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="group flex items-center justify-center h-9 w-9 rounded-full text-app-text-secondary transition-all duration-200 hover:bg-app-surface-glass-strong hover:text-app-text-primary cursor-pointer"
                      title="More actions"
                    >
                      <EllipsisVertical
                        size={16}
                        className="transition-transform duration-200 group-hover:scale-110"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-app-surface-elevated border border-app-border-default shadow-xl rounded-xl p-1">
                    {isEditorRequired && (
                      <DropdownMenuItem
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong rounded-lg cursor-pointer transition-colors"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong rounded-lg cursor-pointer transition-colors"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} className="text-red-300" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }

              {/* Share Dialog without button trigger */}
              <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                <DialogContent className="sm:max-w-md bg-app-surface-elevated border-app-border-default shadow-2xl rounded-2xl p-6">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl font-bold tracking-tight text-app-text-primary flex items-center gap-2">
                      Share Item
                    </DialogTitle>
                    <DialogDescription className="text-app-text-muted text-sm">
                      Generate a public link to share this item with anyone.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-6 bg-app-surface-glass p-5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label
                          htmlFor="public-mode"
                          className="text-sm font-medium text-app-text-primary cursor-pointer"
                        >
                          Public Access
                        </label>
                        <p className="text-xs text-app-text-muted">
                          {item?.isPublic ? "Anyone with the link can view" : "Only you can access this item"}
                        </p>
                      </div>
                      <Switch
                        id="public-mode"
                        checked={item?.isPublic || false}
                        onCheckedChange={handleTogglePublic}
                        className="data-[state=checked]:bg-app-primary cursor-pointer"
                      />
                    </div>

                    {item?.isPublic && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p className="text-xs font-semibold text-app-text-soft uppercase tracking-wider">Public Share Link</p>
                        <div className="flex items-center gap-2 bg-app-surface-glass p-2 rounded-xl border border-app-border-default focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all duration-200">
                          <input
                            readOnly
                            value={typeof window !== 'undefined' ? `${window.location.origin}/share/${id}` : ""}
                            className="flex-1 bg-transparent border-none text-sm text-app-text-primary px-2 outline-none select-all"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const url = typeof window !== 'undefined' ? `${window.location.origin}/share/${id}` : "";
                              navigator.clipboard.writeText(url);
                              toast.success("Link copied to clipboard");
                            }}
                            className="h-8 gap-1.5 px-3 rounded-full text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong shrink-0 active:scale-95 transition-transform"
                          >
                            <Copy size={14} />
                            <span className="text-xs font-medium">Copy</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* CONTENT AREA & CHAT */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="relative flex-1 overflow-y-auto bg-app-canvas">

            {/* COVER IMAGE */}
            {item?.type === "note" && (
              <div className="w-full relative group">
                {item.coverImage ? (
                  <div className="relative w-full h-48 sm:h-64 overflow-hidden border-b border-app-border-default bg-app-surface-glass">
                    <img src={item.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    {isEditing && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setIsCoverDialogOpen(true)} className="h-8 rounded-full">
                          Edit Cover
                        </Button>
                      </div>
                    )}
                  </div>
                ) : isEditing ? (
                  <div className="max-w-4xl mx-auto px-8 sm:px-12 pt-8 -mb-4 flex justify-center items-center">
                    <Button variant="ghost" onClick={() => setIsCoverDialogOpen(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-app-text-muted hover:text-app-text-primary h-8 px-3 rounded-md">
                      <Plus size={14} className="mr-2" />
                      Add Cover
                    </Button>
                  </div>
                ) : null}

                {/* Cover Dialog */}
                <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
                  <DialogContent className="sm:max-w-md bg-app-surface-elevated border-app-border-default shadow-2xl rounded-2xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold tracking-tight text-app-text-primary">Cover Image</DialogTitle>
                      <DialogDescription className="text-sm text-app-text-muted">
                        Upload an image or paste a link to set the cover for this note.
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
                            className="w-full h-11 rounded-xl bg-app-primary hover:text-app-text-primary hover:bg-brand-primary/90 transition-all shadow-sm font-medium hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                          >
                            Save
                          </Button>}
                        </div>
                      </TabsContent>
                    </Tabs>

                    {item?.coverImage && (
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
                          onClick={handleRemoveCover}
                          className="rounded-xl text-red-500 hover:bg-red-500/50!"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleUploadCover} accept="image/*" className="hidden" />

            {isLoading || content === null ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-8 rounded-full border-2 border-app-border-default border-t-app-text-primary animate-spin" />
              </div>
            ) : (
              <div className="h-full w-full">
                {data.item.type === "note" ? (
                  <NoteEditor
                    key={`${id}-${data.item.updatedAt}`}
                    initialData={data.item.content}
                    onChange={setContent}
                    readOnly={!isEditing}
                  />
                ) : data.item.type === "spreadsheet" ? (
                  <SpreadsheetEditor
                    key={`${id}-${data.item.updatedAt}`}
                    initialData={data.item.content}
                    onChange={setContent}
                    readOnly={!isEditing}
                  />
                ) : (
                  <GalleryViewer
                    key={`${id}-${data.item.updatedAt}`}
                    initialData={data.item.content}
                    onChange={(newContent) => {
                      setContent(newContent);
                      mutate(); // Keep SWR completely in sync
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {item?.type !== "gallery" && item?.type !== "album" && (
        <Button
          variant={showChat ? "default" : "ghost"}
          onClick={() => setShowChat(!showChat)}
          size="sm"
          className={`fixed right-6 bottom-6 z-50 group flex size-14 cursor-pointer items-center justify-center rounded-full bg-app-primary text-app-primary-foreground shadow-2xl transition-all hover:scale-110 hover:bg-app-primary-hover active:scale-95 ${showChat ? "bg-app-primary text-white hover:bg-brand-primary/90 hidden" : "text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong"
            }`}
          title={showChat ? "Close AI Assistant" : "Open AI Assistant"}
        >
          <Bot size={24} className="group-hover:rotate-90 transition-transform duration-300 group-hover:text-app-primary text-app-primary-foreground" />
        </Button>
      )}


      <AnimatePresence mode="wait">
        {showChat && item?.type !== "gallery" && item?.type !== "album" && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-40 h-full w-[400px] shrink-0 border-l border-app-border-subtle shadow-2xl"
            style={{ border: '1px' }}
          >
            <VaultChatSidePanel
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isChatLoading}
              sendMessage={sendMessageWithContext}
              regenerate={regenerateWithContext}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onClose={() => setShowChat(false)}
              onClearChat={handleClearChat}
              itemTitle={title || "Untitled Item"}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

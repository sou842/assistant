"use client";

import { useEffect, useState } from "react";
import { Trash2, FileText, Table2, Image as ImageIcon, Share2, Copy, MoreHorizontal, EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
Type: ${data.item.type}
Title: ${data.item.title}
Tags: ${data.item.tags?.join(", ") || "None"}
Content Summary: ${data.item.type === "note" ? "A document with multiple blocks." : `A spreadsheet with ${data.item.content?.length || 0} rows.`}
` : "";

    await sendMessage(payload, {
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, assisting the user with a specific item in their Vault. 
Help them analyze, summarize, or edit this data. You have tools to update the vault item if needed.

${itemContext}

Prioritize actions and responses related to this item.`,
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
Type: ${data.item.type}
Title: ${data.item.title}
Tags: ${data.item.tags?.join(", ") || "None"}
Content Summary: ${data.item.type === "note" ? "A document with multiple blocks." : `A spreadsheet with ${data.item.content?.length || 0} rows.`}
` : "";

    regenerate({
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, assisting the user with a specific item in their Vault. 
Help them analyze, summarize, or edit this data. You have tools to update the vault item if needed.

${itemContext}

Prioritize actions and responses related to this item.`,
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

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <p className="mb-4 text-app-danger-strong">Failed to load item</p>
        <Link href="/ai/vault" className="text-sm text-app-text-faint underline hover:text-app-text-primary">Back to Vault</Link>
      </div>
    );
  }

  const item = data?.item;

  return (
    <div className="flex h-full flex-1 flex-col bg-app-surface">
      <PageHeader
        backHref="/ai/vault"
        icon={item?.type === "note" ? <FileText /> : item?.type === "spreadsheet" ? <Table2 /> : <ImageIcon />}
        title={
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full max-w-md border-none bg-transparent px-0 text-base font-medium text-app-text-primary outline-none placeholder:text-app-text-ghost"
            placeholder="Enter title..."
          />
        }
        subtitle={"Manage the files here"}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="rounded-full text-xs"
              title="Save changes"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>

            {/* More Options Dropdown */}
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
                <DropdownMenuItem
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong rounded-lg cursor-pointer transition-colors"
                >
                  <Share2 size={14} />
                  <span>Share Item</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                >
                  <Trash2 size={14} className="text-red-300" />
                  <span>Delete Item</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                />
              ) : data.item.type === "spreadsheet" ? (
                <SpreadsheetEditor
                  key={`${id}-${data.item.updatedAt}`}
                  initialData={data.item.content}
                  onChange={setContent}
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

        <AnimatePresence mode="wait">
          {showChat && item?.type !== "gallery" && item?.type !== "album" && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-40 h-full w-[400px] shrink-0 border-l border-app-border-subtle shadow-2xl"
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
    </div>
  );
}

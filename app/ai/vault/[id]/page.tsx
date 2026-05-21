"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Save, Trash2, Database, FileText, Table2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { NoteEditor } from "../_components/note-editor";
import { SpreadsheetEditor } from "../_components/spreadsheet-editor";
import { GalleryViewer } from "../_components/gallery-viewer";
import { PageHeader } from "../../_components/page-header";
import { useAI } from "../../_components/ai-provider";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { VaultChatSidePanel } from "../_components/vault-chat-side-panel";
import { mistralModels } from "@/components/ai/chat-input";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export default function VaultItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setMobileSidebarOpen } = useAI();

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
        <p className="text-red-400 mb-4">Failed to load item</p>
        <Link href="/ai/vault" className="text-sm text-white/40 hover:text-white underline">Back to Vault</Link>
      </div>
    );
  }

  const item = data?.item;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A]">
      <PageHeader
        backHref="/ai/vault"
        icon={item?.type === "note" ? <FileText /> : item?.type === "spreadsheet" ? <Table2 /> : <ImageIcon />}
        title={
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none text-base font-medium text-white outline-none w-full max-w-md placeholder:text-white/20 px-0"
            placeholder="Enter title..."
          />
        }
        subtitle={"Manage the files here"}
      />

      {/* CONTENT AREA & CHAT */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-[#070707] relative">
          {isLoading || content === null ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
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
              className="w-[400px] shrink-0 h-full z-40 relative shadow-2xl border-l border-white/5"
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

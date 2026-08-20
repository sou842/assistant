"use client";

import React, { useRef } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/ai/message-list";
import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  });

export default function SharedChatPage() {
  const params = useParams();
  const id = params?.id as string;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data, error, isLoading } = useSWR(
    id ? `/api/share/chats/${id}` : null,
    fetcher
  );

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-10 bg-app-canvas text-app-text-primary">
        <div className="flex flex-col items-center text-center max-w-lg p-8 bg-app-surface border border-app-border-default rounded-3xl shadow-2xl">
          <div className="size-12 rounded-full bg-brand-primary/10 flex items-center justify-center mb-4 text-brand-primary border border-brand-primary/20">
            <Lock size={24} />
          </div>
          <h3 className="text-lg font-semibold text-app-text-primary mb-2">Access Denied</h3>
          <p className="text-sm text-app-text-secondary mb-6 max-w-sm">
            This conversation is private, or has been deleted by the owner.
          </p>
          <Link
            href="/ai"
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-app-surface-glass-strong text-sm font-medium text-app-text-primary hover:bg-app-surface-hover border border-app-border-subtle transition-all active:scale-95"
          >
            <ArrowLeft className="mr-2 size-4" />
            Go to Assistant
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-app-border-default border-t-brand-primary animate-spin" />
          <span className="text-xs text-app-text-muted">Loading shared chat...</span>
        </div>
      </div>
    );
  }

  const { chat } = data;

  // Map messages to UIMessage structure expected by MessageList
  const uiMessages = (chat.messages || []).map((m: any) => ({
    id: m._id || Math.random().toString(),
    role: m.role,
    content: m.content,
    createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
    toolInvocations: m.toolInvocations || []
  }));

  return (
    <div className="flex-1 flex flex-col min-w-0 relative h-full">
      <Navbar />

      <div className="overflow-y-auto px-4 pt-24 pb-10 flex-1 scroll-smooth scrollbar-hide" ref={scrollRef}>
        <div className="mx-auto w-full max-w-3xl space-y-12 pb-10">
          <MessageList
            messages={uiMessages}
            isLoading={false}
            copyToClipboard={(text) => {
              navigator.clipboard.writeText(text);
              toast.success("Copied to clipboard");
            }}
            onSaveMemory={() => {}}
            regenerate={async () => {}}
            selectedModel="mistral"
            scrollContainerRef={scrollRef}
            isShared={true}
          />
        </div>
      </div>
    </div>
  );
}

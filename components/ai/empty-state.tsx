"use client";

import React from "react";
import {
  CalendarClock,
  PenLine,
  Github,
  Plus,
  Mic,
  AudioLines,
  ArrowRight,
} from "lucide-react";

import { type SendChatMessage } from "@/components/ai/types";
import { ArrowUp } from "lucide-react";
import { useAI } from "@/app/ai/_components/ai-provider";
import { saveStoredChat, deriveChatTitle, type StoredChat } from "@/lib/chat-storage";
import { nanoid } from "nanoid";
import type { UIMessage } from "ai";

interface EmptyStateProps {
  input: string;
  setInput: (v: string) => void;
  sendMessage: SendChatMessage;
  selectedModel: string;
}

export function EmptyState({ input, setInput, sendMessage, selectedModel }: EmptyStateProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { activeChatId, setChats, chats } = useAI();

  const handleSend = async () => {
    if (!input.trim()) return;

    await sendMessage(
      { text: input, files: [] },
      { body: { model: selectedModel } }
    );
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="h-fit mt-64 bg-app-canvas flex flex-col items-center justify-center px-4 text-app-text-primary">
      {/* Heading */}
      <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.02em] bg-gradient-to-r from-app-text-primary to-app-text-muted bg-clip-text text-transparent mb-10">
        What&apos;s on your mind today?
      </h1>

      {/* Main Area */}
      <div className="w-full max-w-[860px]">
        {/* Input Container */}
        <div className="h-[64px] rounded-[32px] bg-app-surface-glass border border-app-border-subtle flex items-center px-4 shadow-sm focus-within:border-app-border-strong transition-colors">
          {/* Left */}
          <button className="text-app-text-soft hover:text-app-text-primary transition p-2">
            <Plus size={20} strokeWidth={2.2} />
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            className="flex-1 bg-transparent border-none outline-none px-2 text-base text-app-text-primary placeholder:text-app-text-muted font-normal"
          />

          {/* Right */}
          <div className="flex items-center gap-3">
            <button className="text-app-text-soft hover:text-app-text-primary transition p-2">
              <Mic size={18} strokeWidth={2} />
            </button>

            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${input.trim()
                ? "bg-app-primary text-app-primary-foreground shadow-md hover:scale-105 active:scale-95"
                : "bg-app-surface-glass-strong text-app-text-faint cursor-not-allowed"
                }`}
            >
              {input.trim() ? (
                <ArrowRight size={20} strokeWidth={2.5} />
              ) : (
                <AudioLines size={18} strokeWidth={2.4} />
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <QuickActionButton
            icon={<PenLine size={15} />}
            label="Write or edit"
            onClick={() => handleQuickAction("Help me write a blog post on AI")}
          />

          <QuickActionButton
            icon={<CalendarClock size={15} />}
            label="Scheduler Automation"
            onClick={() => handleQuickAction("create a Scheduler task to send daily weather report of Kolkata to +91 9903149299 at 8:30 AM")}
          />

          <QuickActionButton
            icon={<Github size={15} />}
            label="GitHub Stats"
            onClick={() => handleQuickAction("Show my github stats")}
          />
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 px-5 h-[42px] rounded-full border border-app-border-default bg-transparent hover:bg-app-surface-glass-strong hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
    >
      <span className="text-app-text-soft group-hover:text-app-text-primary transition">
        {icon}
      </span>

      <span className="text-[15px] font-normal text-app-text-secondary">
        {label}
      </span>
    </button>
  );
}

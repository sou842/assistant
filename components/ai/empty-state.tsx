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
  setInput: (v: string) => void;
  children?: React.ReactNode;
}

export function EmptyState({ setInput, children }: EmptyStateProps) {
  const handleQuickAction = (text: string) => {
    setInput(text);
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
        <div className="w-full">
          {children}
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

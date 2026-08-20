"use client";

import React, { useMemo } from "react";
import {
  PenLine,
  Github,
  MessageSquare,
  MessageCircle,
  Sparkles,
  Code,
  Image as ImageIcon,
  MoreHorizontal
} from "lucide-react";

import { useAI } from "@/app/ai/_components/ai-provider";
import { useSession } from "next-auth/react";

interface EmptyStateProps {
  setInput: (v: string) => void;
  children?: React.ReactNode;
}

export function EmptyState({ setInput, children }: EmptyStateProps) {
  const { data: session } = useSession();
  const { chats, onSelectChat } = useAI();

  const userName = session?.user?.name ? session.user.name.split(" ")[0] : "";
  
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  return (
    <div className="h-fit mt-32 bg-app-canvas flex flex-col items-center justify-center px-4 text-app-text-primary">

      {/* Heading */}
      <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-app-text-primary mb-10 text-center">
        {greeting}{userName ? `, ${userName}` : ""}
      </h1>

      {/* Main Area */}
      <div className="w-full max-w-215 space-y-6">
        {/* Input Container */}
        <div className="w-full">
          {children}
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap justify-center gap-3 select-none">
          <button
            onClick={() => handleQuickAction("Generate a futuristic design concept for a web app dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <ImageIcon size={13} className="text-brand-primary opacity-80" />
            Create images
          </button>

          <button
            onClick={() => handleQuickAction("Analyze this codebase layout and describe its design system")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <Sparkles size={13} className="text-brand-primary opacity-80" />
            Analyze images
          </button>

          <button
            onClick={() => handleQuickAction("Write a highly optimized TypeScript debounce hook function")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <Code size={13} className="text-brand-primary opacity-80" />
            Code
          </button>

          <button
            onClick={() => handleQuickAction("Show my current scheduler configurations and automated tasks")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <MoreHorizontal size={13} className="text-brand-primary opacity-80" />
            More
          </button>
        </div>

        {/* Recent Chats Grid */}
        {chats && chats.length > 0 && (
          <div className="pt-12 space-y-4 text-left select-none animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-app-text-muted" />
              <h2 className="text-xs font-semibold text-app-text-secondary tracking-tight">Your Recent chats</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {chats.slice(0, 3).map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="p-5 rounded-2xl bg-app-surface hover:bg-app-surface-hover border border-transparent transition-all cursor-pointer group flex flex-col justify-between h-36 shadow-xs hover:shadow-md hover:scale-[1.02] duration-200"
                >
                  <div className="space-y-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-app-surface-elevated">
                      <MessageCircle size={14} className="text-brand-primary" />
                    </div>
                    <p className="text-[13px] font-semibold text-app-text-primary line-clamp-2 leading-relaxed tracking-tight">{chat.title}</p>
                  </div>
                  <span className="text-[10px] text-app-text-ghost font-medium">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

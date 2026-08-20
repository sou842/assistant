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
      {/* Limited free plan badge */}
      <div className="mb-6 px-3 py-1 rounded-full bg-app-surface-glass border border-app-border-subtle text-[10px] font-semibold text-app-text-soft">
        Using limited free plan <span className="text-app-text-primary font-bold hover:underline cursor-pointer">Upgrade.</span>
      </div>

      {/* Heading */}
      <h1 className="font-display text-4xl sm:text-5xl text-app-text-primary mb-3 text-center font-normal tracking-tight">
        {greeting}{userName ? `, ${userName}` : ""}
      </h1>
      <p className="text-xs sm:text-sm text-app-text-muted mb-10 text-center max-w-md leading-relaxed font-sans opacity-85">
        How can I help you today?
      </p>

      {/* Main Area */}
      <div className="w-full max-w-[860px] space-y-6">
        {/* Input Container */}
        <div className="w-full">
          {children}
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap justify-center gap-3 select-none">
          <button
            onClick={() => handleQuickAction("Generate a futuristic design concept for a web app dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-dashed border-app-border-default/60 hover:border-app-border-strong/80 rounded-full bg-transparent hover:bg-app-surface-glass transition-all cursor-pointer text-app-text-muted hover:text-app-text-secondary font-medium active:scale-95"
          >
            <ImageIcon size={13} className="opacity-70" />
            Create images
          </button>

          <button
            onClick={() => handleQuickAction("Analyze this codebase layout and describe its design system")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-dashed border-app-border-default/60 hover:border-app-border-strong/80 rounded-full bg-transparent hover:bg-app-surface-glass transition-all cursor-pointer text-app-text-muted hover:text-app-text-secondary font-medium active:scale-95"
          >
            <Sparkles size={13} className="opacity-70" />
            Analyze images
          </button>

          <button
            onClick={() => handleQuickAction("Write a highly optimized TypeScript debounce hook function")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-dashed border-app-border-default/60 hover:border-app-border-strong/80 rounded-full bg-transparent hover:bg-app-surface-glass transition-all cursor-pointer text-app-text-muted hover:text-app-text-secondary font-medium active:scale-95"
          >
            <Code size={13} className="opacity-70" />
            Code
          </button>

          <button
            onClick={() => handleQuickAction("Show my current scheduler configurations and automated tasks")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-dashed border-app-border-default/60 hover:border-app-border-strong/80 rounded-full bg-transparent hover:bg-app-surface-glass transition-all cursor-pointer text-app-text-muted hover:text-app-text-secondary font-medium active:scale-95"
          >
            <MoreHorizontal size={13} className="opacity-70" />
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
                  className="p-5 rounded-xl bg-app-surface hover:bg-app-surface-hover border border-transparent transition-all cursor-pointer group flex flex-col justify-between h-32 shadow-sm duration-200"
                >
                  <div className="space-y-2">
                    <MessageCircle size={15} className="text-app-text-muted group-hover:text-app-text-primary transition-colors" />
                    <p className="text-[13px] font-medium text-app-text-secondary line-clamp-2 leading-relaxed opacity-90">{chat.title}</p>
                  </div>
                  <span className="text-[10px] text-app-text-faint">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

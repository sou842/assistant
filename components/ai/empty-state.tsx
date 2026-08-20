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
    <div className="h-fit bg-app-canvas flex flex-col items-center justify-center px-4 text-app-text-primary">

      {/* Heading */}
      <h1 className="font-display text-4xl sm:text-4xl font-normal tracking-tight text-app-text-primary mb-10 text-center">
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
            <ImageIcon size={13} className="text-app-primary opacity-80" />
            Create images
          </button>

          <button
            onClick={() => handleQuickAction("Analyze this codebase layout and describe its design system")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <Sparkles size={13} className="text-app-primary opacity-80" />
            Analyze images
          </button>

          <button
            onClick={() => handleQuickAction("Write a highly optimized TypeScript debounce hook function")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <Code size={13} className="text-app-primary opacity-80" />
            Code
          </button>

          <button
            onClick={() => handleQuickAction("Show my current scheduler configurations and automated tasks")}
            className="flex items-center gap-2 px-4 py-2 text-[11px] border border-transparent shadow-xs hover:shadow-sm rounded-full bg-app-surface hover:bg-app-surface-hover transition-all duration-200 cursor-pointer text-app-text-secondary hover:text-app-text-primary font-medium active:scale-95"
          >
            <MoreHorizontal size={13} className="text-app-primary opacity-80" />
            More
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/ai/sidebar";
import { useAI } from "./ai-provider";

export function AIShell({ children }: { children: React.ReactNode }) {
  const {
    activeChatId,
    chats,
    createNewChat,
    mobileSidebarOpen,
    onSelectChat,
    onRenameChat,
    removeChat,
    setMobileSidebarOpen,
    setSidebarOpen,
    sidebarOpen,
    sidebarWidth,
    startResize,
  } = useAI();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-full bg-[#000000]" />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#000000] text-[#E5E5E5] font-sans selection:bg-primary/30">
      <div className="relative flex h-full">
        <Sidebar
          activeChatId={activeChatId}
          chats={chats}
          createNewChat={createNewChat}
          mobileSidebarOpen={mobileSidebarOpen}
          onSelectChat={onSelectChat}
          onRenameChat={onRenameChat}
          removeChat={removeChat}
          setMobileSidebarOpen={setMobileSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
        />

        {sidebarOpen && (
          <button
            className="relative z-20 hidden w-px cursor-col-resize bg-zinc-800/60 transition hover:bg-zinc-600 md:block"
            onMouseDown={startResize}
            type="button"
          />
        )}

        <main className="relative flex min-w-0 flex-1 flex-col bg-[#000000]">
          {children}
        </main>
      </div>
    </div>
  );
}

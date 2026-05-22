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
      <div className="h-screen w-full bg-app-canvas" />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-app-canvas font-sans text-app-text-secondary selection:bg-primary/30">
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
            className="relative z-20 hidden w-px cursor-col-resize bg-app-border-default transition hover:bg-app-border-strong md:block"
            onMouseDown={startResize}
            type="button"
          />
        )}

        <main className="relative flex min-w-0 flex-1 flex-col bg-app-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}

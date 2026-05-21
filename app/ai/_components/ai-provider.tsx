"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  createEmptyChat,
  loadStoredChats,
  syncChatsWithDatabase,
  deleteStoredChat,
  saveStoredChat,
  type StoredChat,
} from "@/lib/chat-storage";
import {
  syncMemoriesWithDatabase,
  loadStoredMemories,
  type MemoryItem,
} from "@/lib/memory-storage";
import { useSidebarResize } from "@/app/ai/_hooks/use-sidebar-resize";
import { mistralModels } from "@/components/ai/chat-input";

interface AIContextType {
  chats: StoredChat[];
  setChats: React.Dispatch<React.SetStateAction<StoredChat[]>>;
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  memories: MemoryItem[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  sidebarWidth: number;
  startResize: () => void;
  isSyncing: boolean;
  createNewChat: () => void;
  removeChat: (id: string) => Promise<void>;
  onRenameChat: (id: string, title: string) => Promise<void>;
  onSelectChat: (id: string) => void;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [chats, setChats] = useState<StoredChat[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const { sidebarWidth, startResize } = useSidebarResize();

  const [selectedModel, setSelectedModelState] = useState<string>(mistralModels[0].id);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected-model");
      if (saved && mistralModels.some(m => m.id === saved)) {
        setSelectedModelState(saved);
      }
    }
  }, []);

  const setSelectedModel = useCallback((id: string) => {
    setSelectedModelState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected-model", id);
    }
  }, []);

  const activeChatIdRef = useRef("");

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const [isInitialized, setIsInitialized] = useState(false);

  const init = useCallback(async () => {
    setIsSyncing(true);
    try {
      await Promise.all([syncChatsWithDatabase(), syncMemoriesWithDatabase()]);

      const [parsedChats, parsedMemories] = await Promise.all([
        loadStoredChats(),
        loadStoredMemories()
      ]);

      setMemories(parsedMemories);
      setChats(parsedChats);
    } catch (error) {
      console.error("Failed to initialize AI data:", error);
      toast.error("Failed to sync with database.");
    } finally {
      setIsSyncing(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isInitialized) return;
    const q = searchParams.get("q");
    if (q) {
      setActiveChatId(q);
    } else if (pathname === "/ai" && !activeChatIdRef.current) {
      setActiveChatId(createEmptyChat().id);
    }
  }, [searchParams, pathname, isInitialized]);

  const createNewChat = useCallback(() => {
    const next = createEmptyChat();
    // We don't necessarily add it to the list yet if we want the "Empty State" to show up first
    // But for consistency with current implementation:
    setActiveChatId(next.id);
    if (pathname !== "/ai") {
      router.push("/ai");
    } else {
      router.replace("/ai");
    }
  }, [pathname, router]);

  const removeChat = useCallback(async (id: string) => {
    const filtered = chats.filter((chat) => chat.id !== id);
    await deleteStoredChat(id);

    if (filtered.length === 0) {
      const fallback = createEmptyChat();
      setChats([fallback]);
      setActiveChatId(fallback.id);
      if (pathname === "/ai") router.replace("/ai");
      return;
    }

    if (id === activeChatId) {
      const nextChat = filtered[0];
      setActiveChatId(nextChat.id);
      if (pathname === "/ai") router.replace(`/ai?q=${nextChat.id}`);
    }

    setChats(filtered);
    toast.success("Chat deleted");
  }, [chats, activeChatId, pathname, router]);

  const onRenameChat = useCallback(async (id: string, title: string) => {
    setChats((prev) => prev.map((chat) => (chat.id === id ? { ...chat, title } : chat)));
    await saveStoredChat({ id, title } as any);
  }, []);

  const onSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setMobileSidebarOpen(false);
    if (pathname !== "/ai" || searchParams.get("q") !== id) {
      router.push(`/ai?q=${id}`);
    }
  }, [pathname, searchParams, router]);

  return (
    <AIContext.Provider
      value={{
        chats,
        setChats,
        activeChatId,
        setActiveChatId,
        memories,
        setMemories,
        sidebarOpen,
        setSidebarOpen,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        sidebarWidth,
        startResize,
        isSyncing,
        createNewChat,
        removeChat,
        onRenameChat,
        onSelectChat,
        selectedModel,
        setSelectedModel,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
}

"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ChatInput, mistralModels } from "@/components/ai/chat-input";
import { MessageList } from "@/components/ai/message-list";
import { motion, AnimatePresence } from "motion/react";
import { GallerySidePanel } from "@/components/ai/gallery-sidepanel";
import { ChatHeader } from "@/components/ai/chat-header";
import { EmptyState } from "@/components/ai/empty-state";
import { getSaveMemoryToolOutputs } from "@/app/ai/_lib/chat-tools";
import { getMessageText } from "@/lib/ai/message-utils";
import {
  deriveChatTitle,
  loadChatDetails,
  saveStoredChat,
  type StoredChat,
} from "@/lib/chat-storage";
import {
  addMemory,
  inferMemoryCategory,
} from "@/lib/memory-storage";
import { nanoid } from "nanoid";
import { useAI } from "./_components/ai-provider";
import { useBrowserExtension } from "@/hooks/use-browser-extension";

function AIPageContent() {
  const PERF_DEBUG = process.env.NEXT_PUBLIC_CHAT_PERF_DEBUG === "1";
  const STREAM_RENDER_THROTTLE_MS = 80;
  const CHAT_SIDEBAR_SYNC_DEBOUNCE_MS = 800;

  const {
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    memories,
    setMemories,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    isSyncing,
    selectedModel,
    setSelectedModel,
  } = useAI();

  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const activeChatIdRef = useRef("");
  const lastLoadedQRef = useRef<string | null>(null);
  const persistedToolCallsRef = useRef(new Set<string>());
  const chatSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStreamRenderTickRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const lastAutoScrollTsRef = useRef(0);
  const perfSamplesRef = useRef({ streamUpdates: 0, longFrames: 0, lastTokenTs: 0 });
  const [renderMessages, setRenderMessages] = useState<UIMessage[]>([]);

  // Gallery Side Panel states
  const [showGallerySidePanel, setShowGallerySidePanel] = useState(false);
  const [gallerySearchQuery, setGallerySearchQuery] = useState("");
  const [customFileToAttach, setCustomFileToAttach] = useState<any | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const chat = useChat({
    maxSteps: 20,
    experimental_throttle: STREAM_RENDER_THROTTLE_MS,
    async onToolCall({ toolCall }) {
      console.log("[Jarvis AI] Tool Call Received from AI Model:", toolCall);
      if (toolCall.toolName === "browserControl") {
        const { action, url, selector, query, script, description } = toolCall.input as any;
        console.log("[Jarvis AI] Executing Browser Control command:", { action, url, selector, query, script, description });
        setBrowserCommandStates((prev) => ({
          ...prev,
          [toolCall.toolCallId]: { status: "running" }
        }));
        try {
          const extensionResult = await sendBrowserCommand({
            action,
            url,
            selector,
            query,
            script,
            description
          });
          console.log("[Jarvis AI] Browser command success response from extension:", extensionResult);
          setBrowserCommandStates((prev) => ({
            ...prev,
            [toolCall.toolCallId]: { status: "success", result: extensionResult }
          }));
          return extensionResult;
        } catch (err: any) {
          console.error("[Jarvis AI] Browser command failed to execute:", err);
          setBrowserCommandStates((prev) => ({
            ...prev,
            [toolCall.toolCallId]: { status: "error", error: err.message || String(err) }
          }));
          return { error: err.message || String(err) };
        }
      }
    },
    onFinish: async ({ message }) => {

      for (const { toolCallId, output } of getSaveMemoryToolOutputs(message)) {
        if (persistedToolCallsRef.current.has(toolCallId)) {
          continue;
        }

        persistedToolCallsRef.current.add(toolCallId);
        const newMemory = await addMemory({
          title: output.memory.title,
          content: output.memory.content,
          category: output.memory.category,
          source: "chat",
          tags: [...new Set([...output.memory.tags, "chat", "tool"])],
        });

        if (newMemory) {
          setMemories(prev => [newMemory, ...prev]);
        }
        toast.success("Saved to memory.");
      }
    },
    onError: (err) => {
      console.error("Chat error:", err);
      toast.error("Chat request failed. Please try again.");
    },
  });

  const { messages, sendMessage, status, regenerate, setMessages } = chat;

  const isLoading = status === "submitted" || status === "streaming";

  const { isConnected: extensionConnected, sendBrowserCommand, openCompanion } = useBrowserExtension();
  const [browserCommandStates, setBrowserCommandStates] = useState<Record<string, {
    status: "idle" | "running" | "success" | "error";
    error?: string;
    result?: any;
  }>>({});

  // Notify extension of AI planning & status
  useEffect(() => {
    if (!extensionConnected) return;

    const lastMessage = messages[messages.length - 1];
    let thought = "";
    let aiStatus: "thinking" | "streaming" | "ready" | "error" | "executing_tool" = "ready";

    if (status === "submitted") {
      aiStatus = "thinking";
      thought = "Connecting to Jarvis Brain & planning next steps...";
    } else if (status === "streaming") {
      aiStatus = "streaming";
      // Find the last assistant message and use its content as the live thought stream
      const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
      if (lastAssistantMessage) {
        thought = getMessageText(lastAssistantMessage);

        // Check if there are incomplete tool calls in it
        const hasActiveToolCall = lastAssistantMessage.parts?.some(
          part => part.type === "tool-call" && !messages.some(
            m => m.role === "tool" && m.parts?.some(
              p => p.type === "tool-result" && p.toolCallId === (part as any).toolCallId
            )
          )
        );
        if (hasActiveToolCall) {
          aiStatus = "executing_tool";
        }
      } else {
        thought = "Thinking...";
      }
    } else if (status === "error") {
      aiStatus = "error";
      thought = "An error occurred during response generation.";
    } else {
      aiStatus = "ready";
      thought = "Idle. Awaiting user prompt.";
    }

    // Send the state update to the browser extension
    window.postMessage({
      source: "jarvis-webpage",
      messageId: "status-update-" + Date.now(),
      message: {
        action: "update_ai_status",
        status: aiStatus,
        thought: thought
      }
    }, "*");
  }, [status, messages, extensionConnected]);


  const syncActiveChatSummary = useCallback((nextMessages: UIMessage[]) => {
    if (!activeChatId || activeChatId !== activeChatIdRef.current) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChatId) {
          const hasExistingMessages = Array.isArray(chat.messages);
          const isSameLength = hasExistingMessages && chat.messages.length === nextMessages.length;
          return {
            ...chat,
            messages: nextMessages,
            title: deriveChatTitle(nextMessages),
            updatedAt: (!hasExistingMessages || isSameLength) ? chat.updatedAt : Date.now(),
          };
        }
        return chat;
      })
    );
  }, [activeChatId, setChats]);

  // Initial load effect
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) {
      setMessages([]);
      lastLoadedQRef.current = null;
      return;
    }

    if (lastLoadedQRef.current === q) return;
    lastLoadedQRef.current = q;

    const loadChat = async () => {
      try {
        const fullChat = await loadChatDetails(q);
        if (fullChat) {
          setMessages(fullChat.messages || []);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Failed to load chat details:", error);
      }
    };
    loadChat();
  }, [searchParams, setMessages]);

  useEffect(() => {
    if (!activeChatId || activeChatId !== activeChatIdRef.current) return;
    if (isLoading) return;
    syncActiveChatSummary(messages);
  }, [messages, activeChatId, isLoading, syncActiveChatSummary]);

  useEffect(() => {
    if (!activeChatId || activeChatId !== activeChatIdRef.current || !isLoading) return;

    if (chatSyncTimerRef.current) {
      clearTimeout(chatSyncTimerRef.current);
    }

    chatSyncTimerRef.current = setTimeout(() => {
      syncActiveChatSummary(messages);
      chatSyncTimerRef.current = null;
    }, CHAT_SIDEBAR_SYNC_DEBOUNCE_MS);

    return () => {
      if (chatSyncTimerRef.current) {
        clearTimeout(chatSyncTimerRef.current);
      }
    };
  }, [messages, isLoading, activeChatId, syncActiveChatSummary]);

  useEffect(() => {
    if (!messages.length) {
      setRenderMessages(messages);
      return;
    }

    if (!isLoading) {
      setRenderMessages(messages);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastStreamRenderTickRef.current;
    const tick = () => {
      setRenderMessages(messages);
      lastStreamRenderTickRef.current = Date.now();
      if (PERF_DEBUG) {
        perfSamplesRef.current.streamUpdates += 1;
      }
    };

    if (elapsed >= STREAM_RENDER_THROTTLE_MS) {
      tick();
      return;
    }

    if (streamRenderTimerRef.current) {
      clearTimeout(streamRenderTimerRef.current);
    }
    streamRenderTimerRef.current = setTimeout(tick, STREAM_RENDER_THROTTLE_MS - elapsed);

    return () => {
      if (streamRenderTimerRef.current) {
        clearTimeout(streamRenderTimerRef.current);
      }
    };
  }, [messages, isLoading, PERF_DEBUG]);

  const scheduleAutoScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    const now = performance.now();
    if (now - lastAutoScrollTsRef.current < 48) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      lastAutoScrollTsRef.current = performance.now();
      scrollRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      shouldAutoScrollRef.current = distanceToBottom <= 120;
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    scheduleAutoScroll();
  }, [renderMessages, status, scheduleAutoScroll]);

  const selectedModelData = useMemo(
    () => mistralModels.find((model) => model.id === selectedModel),
    [selectedModel]
  );

  const onEditMessage = async (id: string, content: string) => {
    const messageIndex = messages.findIndex(m => m.id === id);
    if (messageIndex === -1) return;

    const updatedMessage = {
      ...messages[messageIndex],
      content,
      parts: [{ type: "text", text: content }],
    } as UIMessage;
    const truncatedMessages = [...messages.slice(0, messageIndex), updatedMessage];

    setMessages(truncatedMessages);
    setRenderMessages(truncatedMessages);

    await saveStoredChat({
      id: activeChatId,
      messages: truncatedMessages,
      updatedAt: Date.now()
    } as any);

    try {
      const enabledMemories = memories
        .filter((m) => m.enabled && m.content.trim())
        .slice(0, 24)
        .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

      const reloadOptions = {
        body: {
          memories: enabledMemories,
          chatId: activeChatId,
        }
      };

      if (typeof (chat as any).reload === 'function') {
        await (chat as any).reload(reloadOptions);
      } else if (typeof (chat as any).regenerate === 'function') {
        await (chat as any).regenerate(reloadOptions);
      }
    } catch (e) {
      console.error('Failed to reload chat:', e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Unable to copy"));
  };

  const sendMessageWithMemory = async (
    message: Parameters<typeof sendMessage>[0],
    options?: Parameters<typeof sendMessage>[1]
  ) => {
    const isNewChat = !chats.find(c => c.id === activeChatId);
    if (isNewChat && activeChatId) {
      lastLoadedQRef.current = activeChatId;
      const newStoredChat = {
        id: activeChatId,
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      
      setChats(prev => {
        if (prev.some(c => c.id === activeChatId)) return prev;
        return [newStoredChat as any, ...prev];
      });
      
      window.history.replaceState(null, '', `/ai?q=${activeChatId}`);
      
      // Persist the shell of the new chat immediately so it isn't lost if stream fails
      saveStoredChat(newStoredChat as any).catch(e => console.error("Failed to save new chat", e));
    }

    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    await sendMessage(message, {
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        chatId: activeChatId,
      },
    });
  };

  const regenerateWithMemory = (options?: Parameters<typeof regenerate>[0]) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    regenerate({
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        chatId: activeChatId,
      },
    });
  };

  const saveMessageToMemory = async (text: string) => {
    const content = text.trim();
    if (!content) {
      toast.error("Nothing to remember in this message.");
      return;
    }

    const newMemory = await addMemory({
      content,
      category: inferMemoryCategory(content),
      source: "chat",
      tags: ["chat"],
    });

    if (newMemory) {
      setMemories(prev => [newMemory, ...prev]);
      toast.success("Saved to memory.");
    }
  };

  const handleOpenCompanion = useCallback(() => {
    openCompanion()
      .catch((err) => {
        console.warn("Failed to open companion automatically:", err);
        toast.info("On Firefox, please open the Sidebar manually using Cmd+Opt+Y (Mac) or Ctrl+Alt+Y (Windows/Linux).");
      });
  }, [openCompanion]);

  console.log(renderMessages, "tara renderMessages", activeChatId)

  return (
    <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative w-full h-full">
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <ChatHeader
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          isSyncing={isSyncing}
          extensionConnected={extensionConnected}
          openCompanion={handleOpenCompanion}
        />

        <div className="flex-1 overflow-y-auto px-4 py-10 scroll-smooth scrollbar-hide" ref={scrollRef}>
          <div className="mx-auto w-full max-w-3xl space-y-12 pb-40">
            {renderMessages.length === 0 ? (
              <EmptyState
                input={input}
                setInput={setInput}
                sendMessage={sendMessageWithMemory}
                selectedModel={selectedModel}
              />
            ) : (
              <MessageList
                messages={renderMessages}
                isLoading={isLoading}
                copyToClipboard={copyToClipboard}
                onSaveMemory={saveMessageToMemory}
                regenerate={regenerateWithMemory}
                selectedModel={selectedModel}
                onEditMessage={onEditMessage}
                scrollContainerRef={scrollRef}
                debugPerf={PERF_DEBUG}
                browserCommandStates={browserCommandStates}
              />
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent z-10" />
        {!!renderMessages.length && (
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            sendMessage={sendMessageWithMemory}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            selectedModelData={selectedModelData}
            modelSelectorOpen={modelSelectorOpen}
            setModelSelectorOpen={setModelSelectorOpen}
            onShowGallerySidePanel={(show, search) => {
              setShowGallerySidePanel(show);
              if (search !== undefined) setGallerySearchQuery(search);
            }}
            customFileToAttach={customFileToAttach}
            onCustomFileAttached={() => setCustomFileToAttach(null)}
          />
        )}
      </div>

      {/* Gallery Assets Sliding Side Panel */}
      <AnimatePresence mode="wait">
        {showGallerySidePanel && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-[400px] shrink-0 h-full z-40 relative shadow-2xl border-l border-white/5"
          >
            <GallerySidePanel
              searchQuery={gallerySearchQuery}
              setSearchQuery={setGallerySearchQuery}
              onClose={() => setShowGallerySidePanel(false)}
              onSelectFile={(file) => {
                setCustomFileToAttach({
                  id: file.id,
                  filename: file.filename,
                  url: file.url,
                  mediaType: file.mediaType,
                });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center bg-[#000000] text-white/20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Initializing Jarvis...</span>
        </div>
      </div>
    }>
      <AIPageContent />
    </Suspense>
  );
}

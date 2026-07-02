"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { toast } from "sonner";

import { ChatInput, mistralModels } from "@/components/ai/chat-input";
import { MessageList } from "@/components/ai/message-list";
import { motion, AnimatePresence } from "motion/react";
import { GallerySidePanel } from "@/components/ai/gallery-sidepanel";
import dynamic from "next/dynamic";
import { ChatHeader } from "@/components/ai/chat-header";

const VaultItemSidePanel = dynamic(
  () => import("@/components/ai/vault-item-sidepanel").then(mod => mod.VaultItemSidePanel),
  { ssr: false }
);
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
import { useAI } from "../_components/ai-provider";
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
    setSidebarOpen,
  } = useAI();

  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const activeChatIdRef = useRef("");
  const lastLoadedQRef = useRef<string | null>(null);
  const messagesChatIdRef = useRef<string | null>(null);
  const persistedToolCallsRef = useRef(new Set<string>());
  const chatSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStreamRenderTickRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);
  const lastAutoScrollTsRef = useRef(0);
  const perfSamplesRef = useRef({ streamUpdates: 0, longFrames: 0, lastTokenTs: 0 });
  const [renderMessages, setRenderMessages] = useState<UIMessage[]>([]);

  const vaultItemId = searchParams.get("vaultItem");
  const [vaultPanelWidth, setVaultPanelWidth] = useState(650);
  const isDraggingVaultPanelRef = useRef(false);

  useEffect(() => {
    if (vaultItemId) {
      setSidebarOpen(false);
    }
  }, [vaultItemId, setSidebarOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingVaultPanelRef.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 1200) {
        setVaultPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingVaultPanelRef.current) {
        isDraggingVaultPanelRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
      if (toolCall.toolName === "browserControl") {
        const { action, url, selector, query, script, description, prompt } = toolCall.input as any;
        console.log("[Jarvis AI] Delegating Browser Control command:", { action, url, selector, query, script, description, prompt });
        setBrowserCommandStates((prev) => ({
          ...prev,
          [toolCall.toolCallId]: { status: "running" }
        }));
        try {
          // Open companion side panel to display the execution
          try {
            await openCompanion();
          } catch (e) {
            console.warn("Could not open companion panel automatically:", e);
          }

          const agentPrompt = prompt || description || `${action} ${url || query || ""}`.trim();
          const targetAction = action || "run_agent";

          // Send command to extension
          const directResult = await sendBrowserCommand({
            action: targetAction,
            url, selector, query, script,
            prompt: agentPrompt,
            model: selectedModel,
            description: description || `Executing: "${agentPrompt}"`
          });

          let finalResult = directResult;

          if (targetAction === "run_agent") {
            // Wait for extension to finish executing by listening to broadcast logs
            finalResult = await new Promise((resolve, reject) => {
              const handleBroadcast = (event: MessageEvent) => {
                if (event.source !== window) return;
                const data = event.data;
                if (data && data.source === "jarvis-extension-event" && data.event === "log_updated") {
                  const log = data.payload;
                  if (log && log.action === "agent") {
                    if (log.status === "success") {
                      window.removeEventListener("message", handleBroadcast);
                      resolve({ success: true, result: log.detail });
                    } else if (log.status === "error") {
                      window.removeEventListener("message", handleBroadcast);
                      reject(new Error(log.error || log.detail || "Agent execution failed"));
                    }
                  }
                }
              };
              window.addEventListener("message", handleBroadcast);

              // Safety timeout: 5 minutes
              setTimeout(() => {
                window.removeEventListener("message", handleBroadcast);
                reject(new Error("Browser task execution timed out"));
              }, 300000);
            });
          }

          console.log("[Jarvis AI] Browser command completed:", finalResult);
          setBrowserCommandStates((prev) => ({
            ...prev,
            [toolCall.toolCallId]: { status: "success", result: finalResult }
          }));

          setTimeout(async () => {
            if (activeChatIdRef.current) {
              try {
                const fullChat = await loadChatDetails(activeChatIdRef.current);
                if (fullChat && fullChat.messages) {
                  setMessages(fullChat.messages);
                }
              } catch (e) {
                console.error("Failed to refetch chat after browser control:", e);
              }
            }
          }, 2500);

          return finalResult;
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

  const { messages, sendMessage, status, regenerate, setMessages, stop } = chat;

  const deleteMessage = async (id: string) => {
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return;
    const newMessages = messages.slice(0, index);
    setMessages(newMessages);

    if (activeChatIdRef.current) {
      await saveStoredChat({
        id: activeChatIdRef.current,
        title: deriveChatTitle(newMessages),
        messages: newMessages,
        updatedAt: Date.now(),
      } as any);
    }
  };

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
            m => m?.role === "tool" && m.parts?.some(
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
          const isInitialLoad = hasExistingMessages && chat.messages.length === 0 && nextMessages.length > 0;
          return {
            ...chat,
            messages: nextMessages,
            title: deriveChatTitle(nextMessages),
            updatedAt: (!hasExistingMessages || isSameLength || isInitialLoad) ? chat.updatedAt : Date.now(),
          };
        }
        return chat;
      })
    );
  }, [activeChatId, setChats]);

  // Initial load effect
  useEffect(() => {
    const q = activeChatId;
    if (!q) {
      setMessages([]);
      lastLoadedQRef.current = null;
      messagesChatIdRef.current = null;
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
        messagesChatIdRef.current = q;
      } catch (error) {
        console.error("Failed to load chat details:", error);
      }
    };
    loadChat();
  }, [activeChatId, setMessages]);

  useEffect(() => {
    if (!activeChatId || activeChatId !== activeChatIdRef.current) return;
    if (activeChatId !== messagesChatIdRef.current) return;
    if (isLoading) return;
    syncActiveChatSummary(messages);
  }, [messages, activeChatId, isLoading, syncActiveChatSummary]);

  useEffect(() => {
    if (!activeChatId || activeChatId !== activeChatIdRef.current || !isLoading) return;
    if (activeChatId !== messagesChatIdRef.current) return;

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
          browserExtensionConnected: extensionConnected,
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
      messagesChatIdRef.current = activeChatId;
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

      window.history.replaceState(null, '', `/ai/${activeChatId}`);

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
        browserExtensionConnected: extensionConnected,
      },
    });
  };

  // Listen for prompt commands from the browser extension
  useEffect(() => {
    const handleExtensionPrompt = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (data && data.source === "jarvis-extension-event" && data.event === "send_prompt") {
        const prompt = data.payload?.prompt;
        if (prompt && prompt.trim()) {
          setInput(prompt);
          sendMessageWithMemory(prompt);
        }
      }
    };

    window.addEventListener("message", handleExtensionPrompt);
    return () => window.removeEventListener("message", handleExtensionPrompt);
  }, [sendMessageWithMemory]);

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
        browserExtensionConnected: extensionConnected,
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
          <div className="mx-auto w-full max-w-3xl space-y-12 pb-60">
              {renderMessages.length === 0 && !params?.chatId && !isLoading ? (
                  <EmptyState setInput={setInput}>
                    <ChatInput
                      className="w-full relative z-20"
                      input={input}
                      setInput={setInput}
                      isLoading={isLoading}
                      sendMessage={sendMessageWithMemory}
                      stop={stop}
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
                  </EmptyState>
              ) : (
                  <MessageList
                    messages={renderMessages}
                    isLoading={isLoading}
                    copyToClipboard={copyToClipboard}
                    onSaveMemory={saveMessageToMemory}
                    regenerate={regenerateWithMemory}
                    selectedModel={selectedModel}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={deleteMessage}
                    scrollContainerRef={scrollRef}
                    debugPerf={PERF_DEBUG}
                    browserCommandStates={browserCommandStates}
                  />
              )}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-app-canvas via-app-canvas/80 to-transparent" />

        {!(renderMessages.length === 0 && !params?.chatId && !isLoading) && (
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            sendMessage={sendMessageWithMemory}
            stop={stop}
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
            key="gallery-side-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-40 h-full w-[400px] shrink-0 border-l border-app-border-subtle shadow-2xl"
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

        {vaultItemId && (
          <motion.div
            key="vault-side-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: vaultPanelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-40 h-full shrink-0 border-l border-app-border-subtle shadow-2xl bg-app-canvas"
            style={{ width: vaultPanelWidth }}
          >
            {/* Drag Handle */}
            <div
              className="absolute top-0 bottom-0 left-[-3px] w-2 cursor-col-resize z-50 flex items-center justify-center group"
              onMouseDown={(e) => {
                e.preventDefault();
                isDraggingVaultPanelRef.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            >
              <div className="w-0.5 h-12 bg-app-border-subtle group-hover:bg-brand-primary/50 transition-colors rounded-full" />
            </div>

            <VaultItemSidePanel
              itemId={vaultItemId}
              onClose={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("vaultItem");
                router.push(url.pathname + url.search);
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
      <div className="flex h-full w-full items-center justify-center bg-app-canvas text-app-text-ghost">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary"></div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Initializing Jarvis...</span>
        </div>
      </div>
    }>
      <AIPageContent />
    </Suspense>
  );
}

"use client";

import React, { useRef } from "react";
import { MessageList } from "@/components/ai/message-list";
import { ChatInput, mistralModels } from "@/components/ai/chat-input";
import { cn } from "@/lib/utils";
import { Bot, X, MessageSquare, MessageCircle, TextSelect } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UIMessage } from "ai";
import { AnimatePresence } from "motion/react";
import { motion } from 'framer-motion';

interface VaultChatSidePanelProps {
  messages: UIMessage[];
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  sendMessage: (message: any, options?: any) => void;
  regenerate: (options?: any) => void;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  onClose: () => void;
  onClearChat: () => void;
  itemTitle: string;
  itemType?: string;
  selectedContext?: { text: string; html: string } | null;
}

export function VaultChatSidePanel({
  messages,
  input,
  setInput,
  isLoading,
  sendMessage,
  regenerate,
  selectedModel,
  setSelectedModel,
  onClose,
  onClearChat,
  itemTitle,
  itemType,
  selectedContext
}: VaultChatSidePanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(true);
  const selectedModelData = mistralModels.find((m) => m.id === selectedModel);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-950/50 backdrop-blur-3xl border-l border-app-border-default relative transition-all duration-300"
      )}
    >
      {/* Header */}
      <div className="h-16 shrink-0 border-b border-app-border-subtle px-6 flex items-center justify-between bg-app-canvas/20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onClearChat}
            className="h-8 px-3 rounded-full text-xs text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-glass transition-colors"
            title="Clear Chat"
          >
            <MessageCircle size={14} className="mr-1.5" /> Clear
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="size-8 bg-app-surface-glass border-app-border-default rounded-full transition-colors hover:bg-app-surface-glass-strong"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden relative pb-6">
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
            <div className="size-16 rounded-full bg-app-surface-glass flex items-center justify-center mb-6">
              <Bot className="size-8 text-app-text-soft" />
            </div>
            <h3 className="text-app-text-primary font-medium mb-2">Discuss this item</h3>
            <p className="text-sm text-app-text-muted max-w-[240px]">
              Ask Jarvis to summarize, analyze, or help you edit "{itemTitle}".
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-hide p-4 pt-8 pb-72" ref={scrollContainerRef}>
            <MessageList
              messages={messages}
              isLoading={isLoading}
              copyToClipboard={(text) => navigator.clipboard.writeText(text)}
              onSaveMemory={() => { }}
              regenerate={regenerate}
              selectedModel={selectedModel}
              scrollContainerRef={scrollContainerRef}
            />
          </div>
        )}
      </div>

      {/* Footer / Input */}
      <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2">
        <AnimatePresence>
          {selectedContext && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-md mx-2"
            >
              <TextSelect className="size-4 text-indigo-400" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-indigo-300">Targeting selection</span>
                <span className="text-[10px] text-indigo-400/70 truncate w-64">{selectedContext.text.slice(0, 50)}{selectedContext.text.length > 50 ? '...' : ''}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          sendMessage={(msg, opts) => sendMessage(msg, opts)}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedModelData={selectedModelData}
          modelSelectorOpen={false}
          setModelSelectorOpen={() => { }}
          selectedTask={isFocused ? { title: itemTitle, type: itemType } : null}
          setSelectedTask={(val) => setIsFocused(!!val)}
          space={2}
        />
      </div>
    </div>
  );
}

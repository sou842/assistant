"use client";

import React, { useRef } from "react";
import { MessageList } from "@/components/ai/message-list";
import { ChatInput, mistralModels } from "@/components/ai/chat-input";
import { cn } from "@/lib/utils";
import { Bot, X, MessageSquare, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UIMessage } from "ai";

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
  itemTitle
}: VaultChatSidePanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(true);
  const selectedModelData = mistralModels.find((m) => m.id === selectedModel);

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-zinc-950/50 backdrop-blur-3xl border-l border-white/10 relative transition-all duration-300"
      )}
    >
      {/* Header */}
      <div className="h-16 shrink-0 border-b border-white/5 px-6 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onClearChat}
            className="h-8 px-3 rounded-full text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors"
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
            className="size-8 bg-white/5 border-white/10 rounded-full transition-colors hover:bg-white/10"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden relative pb-6">
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Bot className="size-8 text-white/60" />
            </div>
            <h3 className="text-white font-medium mb-2">Discuss this item</h3>
            <p className="text-sm text-white/30 max-w-[240px]">
              Ask Jarvis to summarize, analyze, or help you edit "{itemTitle}".
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-hide p-4 pt-8 pb-32" ref={scrollContainerRef}>
            <MessageList 
              messages={messages}
              isLoading={isLoading}
              copyToClipboard={(text) => navigator.clipboard.writeText(text)}
              onSaveMemory={() => {}}
              regenerate={regenerate}
              selectedModel={selectedModel}
              scrollContainerRef={scrollContainerRef}
            />
          </div>
        )}
      </div>

      {/* Footer / Input */}
      <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          sendMessage={(msg, opts) => sendMessage(msg, opts)}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedModelData={selectedModelData}
          modelSelectorOpen={false}
          setModelSelectorOpen={() => {}}
          selectedTask={isFocused ? { title: itemTitle } : null}
          setSelectedTask={(val) => setIsFocused(!!val)} 
          space={2}
        />
      </div>
    </div>
  );
}

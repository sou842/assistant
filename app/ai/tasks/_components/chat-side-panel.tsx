"use client";

import React, { useRef } from "react";
import { MessageList } from "@/components/ai/message-list";
import { ChatInput, mistralModels } from "@/components/ai/chat-input";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Bot, X, Trash2, Maximize2, Minimize2, MessageSquare, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { UIMessage } from "ai";

interface ChatSidePanelProps {
  messages: UIMessage[];
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  sendMessage: (message: any, options?: any) => void;
  regenerate: (options?: any) => void;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  onClose: () => void;
  selectedTask: any | null;
  setSelectedTask: (task: any | null) => void;
  onClearChat: () => void;
}

export function ChatSidePanel({
  messages,
  input,
  setInput,
  isLoading,
  sendMessage,
  regenerate,
  selectedModel,
  setSelectedModel,
  onClose,
  selectedTask,
  setSelectedTask,
  onClearChat
}: ChatSidePanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: "chat-input-dropzone",
  });

  const selectedModelData = mistralModels.find((m) => m.id === selectedModel);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-zinc-950/50 backdrop-blur-3xl border-l border-white/10 relative transition-all duration-300",
        isOver && "bg-white/[0.03]"
      )}
    >
      {/* Header */}
      <div className="h-16 shrink-0 border-b border-white/5 px-6 flex items-center justify-between bg-black/20">

          <Button
            variant="outline"
            // size="icon"
            onClick={onClearChat}
            className="rounded-full transition-colors"
            title="Clear Chat"
          >
            <MessageCircle size={14} /> Chat
          </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="size-8 bg-white/20 rounded-full transition-colors"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Drop Indicator Overlay */}
      <AnimatePresence>
        {isOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-2xl flex items-center justify-center p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex flex-col items-center gap-6"
            >
              <div className="size-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.15)]">
                <MessageSquare className="size-10" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-2xl text-white tracking-tight">Drop to Focus</h3>
                <p className="text-white/40 text-sm max-w-[200px] leading-relaxed">
                  Jarvis will prioritize this task in your conversation
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message List */}
      <div className="flex-1 overflow-hidden relative pb-6">
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Bot className="size-8 text-white/60" />
            </div>
            <h3 className="text-white font-medium mb-2">How can I help you?</h3>
            <p className="text-sm text-white/30 max-w-[240px]">
              Drag a task here to discuss it, or just start typing to manage your workflow.
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
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          space={2}
        />
      </div>
    </div>
  );
}

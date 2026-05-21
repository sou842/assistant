"use client";

import React from "react";
import { UIMessage } from "ai";
import { Brain, Sparkles, Copy, RotateCcw, ThumbsUp, ThumbsDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMessageAttachments, getMessageReasoning, getMessageText } from "@/lib/ai/message-utils";
import { type RegenerateChatMessage } from "@/components/ai/types";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageAction,
  MessageActions,
} from "@/components/ai-elements/message";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
} from "@/components/ai-elements/attachments";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { WeatherCard } from "@/components/ai/weather-card";
import { BrowserCard } from "@/components/ai/browser-card";
import { Shimmer } from "../ai-elements/shimmer";

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  copyToClipboard: (text: string) => void;
  onSaveMemory: (text: string) => void;
  regenerate: RegenerateChatMessage;
  selectedModel: string;
  onEditMessage?: (id: string, content: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  debugPerf?: boolean;
  browserCommandStates?: Record<string, { status: "idle" | "running" | "success" | "error"; error?: string; result?: any }>;
}

export function MessageList({
  messages,
  isLoading,
  copyToClipboard,
  onSaveMemory,
  regenerate,
  selectedModel,
  onEditMessage,
  scrollContainerRef,
  debugPerf = false,
  browserCommandStates,
}: MessageListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(900);
  const ITEM_ESTIMATE = 240;
  const OVERSCAN = 4;
  const ENABLE_WINDOWING_AT = 80;

  React.useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
        setViewportHeight(el.clientHeight);
        rafId = null;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollContainerRef]);

  // Deduplicate messages by ID to prevent React duplicate key warnings
  const uniqueMessages = React.useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  }, [messages]);

  const isWindowed = uniqueMessages.length >= ENABLE_WINDOWING_AT;
  const totalHeight = isWindowed ? uniqueMessages.length * ITEM_ESTIMATE : 0;
  const startIndex = isWindowed
    ? Math.max(0, Math.floor(scrollTop / ITEM_ESTIMATE) - OVERSCAN)
    : 0;
  const endIndex = isWindowed
    ? Math.min(
      uniqueMessages.length,
      Math.ceil((scrollTop + viewportHeight) / ITEM_ESTIMATE) + OVERSCAN
    )
    : uniqueMessages.length;

  const visibleMessages = isWindowed
    ? uniqueMessages.slice(startIndex, endIndex)
    : uniqueMessages;

  React.useEffect(() => {
    if (!debugPerf || !isLoading) return;
    performance.mark("chat-message-list-render");
  }, [visibleMessages, debugPerf, isLoading]);

  return (
    <>
      {isWindowed ? (
        <div className="relative w-full" style={{ height: totalHeight }}>
          <div
            className="absolute left-0 right-0"
            style={{ transform: `translateY(${startIndex * ITEM_ESTIMATE}px)` }}
          >
            {visibleMessages.map((message) => {
              const isLastStreaming = isLoading && uniqueMessages[uniqueMessages.length - 1].id === message.id;
              return (
                <MessageRow
                  key={message.id}
                  message={message}
                  isLastStreaming={isLastStreaming}
                  copyToClipboard={copyToClipboard}
                  onSaveMemory={onSaveMemory}
                  regenerate={regenerate}
                  selectedModel={selectedModel}
                  onEditMessage={onEditMessage}
                  editingId={editingId}
                  editingContent={editingContent}
                  setEditingId={setEditingId}
                  setEditingContent={setEditingContent}
                  browserCommandStates={browserCommandStates}
                />
              );
            })}
          </div>
        </div>
      ) : (
        visibleMessages.map((message) => {
          const isLastStreaming = isLoading && uniqueMessages[uniqueMessages.length - 1].id === message.id;
          return (
            <MessageRow
              key={message.id}
              message={message}
              isLastStreaming={isLastStreaming}
              copyToClipboard={copyToClipboard}
              onSaveMemory={onSaveMemory}
              regenerate={regenerate}
              selectedModel={selectedModel}
              onEditMessage={onEditMessage}
              editingId={editingId}
              editingContent={editingContent}
              setEditingId={setEditingId}
              setEditingContent={setEditingContent}
              browserCommandStates={browserCommandStates}
            />
          );
        })
      )}

      {isLoading && uniqueMessages[uniqueMessages.length - 1]?.role === 'user' && (
        <Message from="assistant" className="animate-pulse">
          <Shimmer duration={1}>Thinking...</Shimmer>
        </Message>
      )}
    </>
  );
}

type MessageRowProps = {
  message: UIMessage;
  isLastStreaming: boolean;
  copyToClipboard: (text: string) => void;
  onSaveMemory: (text: string) => void;
  regenerate: RegenerateChatMessage;
  selectedModel: string;
  onEditMessage?: (id: string, content: string) => void;
  editingId: string | null;
  editingContent: string;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingContent: React.Dispatch<React.SetStateAction<string>>;
  browserCommandStates?: Record<string, { status: "idle" | "running" | "success" | "error"; error?: string; result?: any }>;
};

const MessageRow = React.memo(function MessageRow({
  message,
  isLastStreaming,
  copyToClipboard,
  onSaveMemory,
  regenerate,
  selectedModel,
  onEditMessage,
  editingId,
  editingContent,
  setEditingId,
  setEditingContent,
  browserCommandStates,
}: MessageRowProps) {
  let text = getMessageText(message);
  if (message.role === "assistant" && !text.trim()) {
    const toolInvocations = (message as any)?.toolInvocations;
    const hasActive = toolInvocations?.some((ti: any) => ti.state === 'call');
    if (hasActive) {
      text = "Executing command...";
    } else if (toolInvocations && toolInvocations.length > 0) {
      const hasError = toolInvocations.some((ti: any) => ti.result && (ti.result.error || 'error' in ti.result));
      if (hasError) {
        text = "Command execution failed. Please check the details below.";
      } else {
        text = "Command executed successfully.";
      }
    }
  }
  const messageAttachments = getMessageAttachments(message);
  const isEditing = editingId === message.id;
  const isStreamingAssistant = isLastStreaming && message.role === "assistant";

  const weatherInvocations = (message as any)?.toolInvocations?.filter(
    (ti: any) => ti.state === 'result' && ti.toolName === 'getWeather' && ti.result && !('error' in ti.result)
  );

  const browserInvocations = (message as any)?.toolInvocations?.filter(
    (ti: any) => ti.toolName === 'browserControl'
  );

  const toolInvocations = (message as any)?.toolInvocations;

  const getToolLabel = (toolName: string, state: string) => {
    const labels: Record<string, string> = {
      getWeather: "Checking weather",
      saveMemory: "Storing memory",
      listTasks: "Retrieving tasks",
      createTask: "Creating task",
      updateTask: "Updating task",
      deleteTask: "Deleting task",
      getTime: "Checking time",
      githubGetUser: "Accessing GitHub",
      githubListRepos: "Listing repositories",
      githubGetRepo: "Analyzing repository",
      githubReadFile: "Reading code",
      githubSearchCode: "Searching code",
      githubListCommits: "Checking history",
      gmailListMessages: "Searching emails",
      gmailGetMessage: "Reading email",
      whatsappSendMessage: "Sending WhatsApp",
      saveContact: "Saving contact",
      listContacts: "Fetching contacts",
      browserControl: "Controlling browser",
    };
    return labels[toolName] || `Executing ${toolName}`;
  };

  return (
    <Message
      key={message.id}
      from={message.role}
      className={isStreamingAssistant ? "" : "animate-in fade-in slide-in-from-bottom-8 duration-700"}
    >
      <div className={`flex gap-6 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 min-w-0 flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
          {message.role === 'assistant' && (
            <Reasoning
              isStreaming={isLastStreaming}
              className="w-full"
            >
              <ReasoningTrigger className="py-2 px-1 text-white/40 hover:text-white/60" />
              <ReasoningContent className="py-4 px-1 text-white/50 leading-relaxed max-w-2xl">
                <div className="flex flex-col gap-3">
                  {/* AI Reasoning Text */}
                  {getMessageReasoning(message) && (
                    <div className="text-sm border-l-2 border-white/10 pl-4 py-1 italic mb-2">
                      {getMessageReasoning(message)}
                    </div>
                  )}

                  {/* Tool Invocations */}
                  {toolInvocations && toolInvocations.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {toolInvocations.map((ti: any, idx: number) => (
                        <div key={ti.toolCallId || idx} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className="flex items-center gap-2.5">
                            <div className={`size-1.5 rounded-full shrink-0 ${ti.state === 'result' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-blue-400 animate-pulse'}`} />
                            <span className="text-xs font-medium tracking-tight text-white/70">
                              {getToolLabel(ti.toolName, ti.state)}
                            </span>
                          </div>

                          {/* Tool Details (Args/Result) */}
                          <div className="text-[10px] opacity-40 ml-4 font-mono truncate max-w-md">
                            {ti.state === 'call' ? (
                              <span>args: {JSON.stringify(ti.args)}</span>
                            ) : (
                              <span className="text-green-500/60">
                                {ti.result?.error ? `Error: ${ti.result.error}` : 'Success'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !getMessageReasoning(message) ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-1.5 bg-white/30 rounded-full shrink-0" />
                        <span className="text-xs">Generating response</span>
                      </div>
                      <div className="text-xs opacity-40 ml-4">
                        {isLastStreaming ? 'In progress' : 'Process completed'}
                      </div>
                    </div>
                  ) : null}
                </div>
              </ReasoningContent>
            </Reasoning>
          )}
          <MessageContent className={message.role === 'user' ? 'group-[.is-user]:bg-[#0A0A0A] group-[.is-user]:text-white/90 group-[.is-user]:rounded-2xl group-[.is-user]:border group-[.is-user]:border-white/5 group-[.is-user]:shadow-2xl' : 'text-white/80'}>
            {isEditing ? (
              <div className="flex flex-col w-full min-w-[400px] bg-transparent rounded-[2rem] p-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <textarea
                  autoFocus
                  className="w-full bg-transparent border-none text-base text-white/90 outline-none resize-none min-h-[80px] placeholder:text-white/20"
                  onChange={(e) => setEditingContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onEditMessage?.(message.id, editingContent);
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  value={editingContent}
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    className="px-4 py-1.5 rounded-full bg-black text-white text-sm font-medium hover:bg-black/80 transition-all active:scale-95"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95 shadow-lg"
                    onClick={() => {
                      onEditMessage?.(message.id, editingContent);
                      setEditingId(null);
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : isStreamingAssistant ? (
              <pre className="whitespace-pre-wrap break-words text-white/80 leading-relaxed text-base">
                {text}
              </pre>
            ) : (
              <MessageResponse isAnimating={isLastStreaming} className="prose prose-invert prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-[#050505] prose-pre:border prose-pre:border-white/5">
                {text}
              </MessageResponse>
            )}

            {!isEditing && weatherInvocations?.map((invocation: any) => (
              <WeatherCard key={invocation.toolCallId} data={invocation.result as any} />
            ))}

            {!isEditing && browserInvocations?.map((invocation: any) => {
              const commandState = browserCommandStates?.[invocation.toolCallId] || {
                status: invocation.state === "result" ? "success" : "idle",
                result: invocation.result
              };
              let cardStatus = commandState.status;
              let cardError = commandState.error;
              let cardResult = commandState.result;

              if (invocation.state === "result" && invocation.result?.status === "delegated_to_client" && cardStatus === "idle") {
                cardStatus = "error";
                cardError = "Browser extension offline.";
              } else if (invocation.state === "result" && invocation.result?.status !== "delegated_to_client") {
                cardStatus = "success";
                cardResult = invocation.result;
              }

              const args = invocation.args || {};
              const action = args.action || "";
              const description = args.description || "";

              return (
                <BrowserCard
                  key={invocation.toolCallId}
                  action={action}
                  description={description}
                  status={cardStatus as any}
                  error={cardError}
                  result={cardResult}
                />
              );
            })}


            {!editingId && messageAttachments.length > 0 && (
              <Attachments className="mt-6 flex flex-wrap gap-3">
                {messageAttachments.map((attachment, index) => (
                  <Attachment key={`${message.id}-${index}`} data={{
                    id: `${message.id}-${index}`,
                    type: 'file',
                    filename: attachment.filename,
                    mediaType: attachment.mediaType,
                    url: attachment.url
                  }} className="rounded-xl border border-white/5 bg-white/5 p-1 hover:border-primary/30 transition-all">
                    <AttachmentPreview />
                  </Attachment>
                ))}
              </Attachments>
            )}
          </MessageContent>

          <MessageToolbar className={cn(
            "mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0",
            message.role === 'user' && "justify-end"
          )}>
            <MessageActions className="bg-[#080808] p-1 rounded-full border border-white/5 shadow-xl">
              <MessageAction tooltip="Copy message" onClick={() => copyToClipboard(text)} className="hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer">
                <Copy size={13} />
              </MessageAction>
              <MessageAction tooltip="Save to memory" onClick={() => onSaveMemory(text)} className="hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full cursor-pointer">
                <Brain size={13} />
              </MessageAction>
              {message.role === 'user' && !editingId && (
                <MessageAction tooltip="Edit message" onClick={() => {
                  setEditingId(message.id);
                  setEditingContent(text);
                }} className="hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer">
                  <Pencil size={13} />
                </MessageAction>
              )}
              {message.role === 'assistant' && (
                <>
                  <MessageAction tooltip="Try again" onClick={() => regenerate({ body: { model: selectedModel } })} className="hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer">
                    <RotateCcw size={13} />
                  </MessageAction>
                  <div className="divider divider-horizontal mx-0 w-px opacity-10 py-1"></div>
                  <MessageAction tooltip="Positive feedback" className="hover:text-green-400 hover:bg-green-400/10 rounded-full cursor-pointer">
                    <ThumbsUp size={13} />
                  </MessageAction>
                  <MessageAction tooltip="Negative feedback" className="hover:text-red-400 hover:bg-red-400/10 rounded-full cursor-pointer">
                    <ThumbsDown size={13} />
                  </MessageAction>
                </>
              )}
            </MessageActions>
          </MessageToolbar>
        </div>
      </div>
    </Message>
  );
}, (prev, next) => {
  if (prev.message.id !== next.message.id) return false;
  if (prev.isLastStreaming !== next.isLastStreaming) return false;
  if (prev.editingId !== next.editingId) return false;
  if (prev.editingContent !== next.editingContent && prev.editingId === prev.message.id) return false;
  if (prev.browserCommandStates !== next.browserCommandStates) return false;
  if (prev.message.parts !== next.message.parts) return false;
  if ((prev.message as any).toolInvocations !== (next.message as any).toolInvocations) return false;
  return getMessageText(prev.message) === getMessageText(next.message);
});

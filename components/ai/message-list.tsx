"use client";

import React, { Dispatch, memo, RefObject, SetStateAction, useEffect, useMemo, useState } from "react";
import { UIMessage } from "ai";
import { Brain, Sparkles, Copy, RotateCcw, ThumbsUp, ThumbsDown, Pencil, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WeatherCard } from "@/components/ai/weather-card";
import { BrowserCard } from "@/components/ai/browser-card";
import { YouTubeCard } from "@/components/ai/youtube-card";
import { VaultCard } from "@/components/ai/vault-card";
import { VaultReferenceCard } from "@/components/ai/vault-reference-card";
import { Shimmer } from "../ai-elements/shimmer";

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  copyToClipboard: (text: string) => void;
  onSaveMemory: (text: string) => void;
  regenerate: RegenerateChatMessage;
  selectedModel: string;
  onEditMessage?: (id: string, content: string) => void;
  onDeleteMessage?: (id: string) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
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
  onDeleteMessage,
  scrollContainerRef,
  debugPerf = false,
  browserCommandStates,
}: MessageListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(900);
  const ITEM_ESTIMATE = 240;
  const OVERSCAN = 4;
  const ENABLE_WINDOWING_AT = 80;

  useEffect(() => {
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
  const uniqueMessages = useMemo(() => {
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

  useEffect(() => {
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
                  onDeleteMessage={onDeleteMessage}
                  editingId={editingId}
                  editingContent={editingContent}
                  setEditingId={setEditingId}
                  setEditingContent={setEditingContent}
                  setDeletingMessageId={setDeletingMessageId}
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
              onDeleteMessage={onDeleteMessage}
              editingId={editingId}
              editingContent={editingContent}
              setEditingId={setEditingId}
              setEditingContent={setEditingContent}
              setDeletingMessageId={setDeletingMessageId}
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

      <AlertDialog open={!!deletingMessageId} onOpenChange={(open) => !open && setDeletingMessageId(null)}>
        <AlertDialogContent className="bg-[#0f0f0f] border border-app-border-subtle">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Message?</AlertDialogTitle>
            <AlertDialogDescription className="text-app-text-secondary">
              This will permanently delete this message and all subsequent messages in this chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent hover:bg-white/5 text-white border-app-border-subtle">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingMessageId) onDeleteMessage?.(deletingMessageId);
                setDeletingMessageId(null);
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  onDeleteMessage?: (id: string) => void;
  editingId: string | null;
  editingContent: string;
  setEditingId: Dispatch<SetStateAction<string | null>>;
  setEditingContent: Dispatch<SetStateAction<string>>;
  setDeletingMessageId: Dispatch<SetStateAction<string | null>>;
  browserCommandStates?: Record<string, { status: "idle" | "running" | "success" | "error"; error?: string; result?: any }>;
};

function extractYouTubeVideoIds(text: string): string[] {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/gi;
  const ids = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

const MessageRow = memo(function MessageRow({
  message,
  isLastStreaming,
  copyToClipboard,
  onSaveMemory,
  regenerate,
  selectedModel,
  onEditMessage,
  onDeleteMessage,
  editingId,
  editingContent,
  setEditingId,
  setEditingContent,
  setDeletingMessageId,
  browserCommandStates,
}: MessageRowProps) {
  const { displayText, uniqueReferences } = useMemo(() => {
    let currentText = getMessageText(message);
    const parsedVaultReferences: Array<{id: string, title: string, type: string}> = [];
    
    // Format 1: [vault-reference:ID:TITLE:TYPE]
    const vaultRefRegex = /\[vault-reference:([^:]+):([^:]+):([^\]]+)\]/g;
    let match;
    while ((match = vaultRefRegex.exec(currentText)) !== null) {
      parsedVaultReferences.push({ id: match[1], title: match[2], type: match[3] });
    }
    
    // Format 2: [Any Title](vault-reference:ID:TITLE:TYPE)
    const vaultLinkRegex = /\[[^\]]+\]\(vault-reference:([^:]+):([^:]+):([^\)]+)\)/g;
    while ((match = vaultLinkRegex.exec(currentText)) !== null) {
      parsedVaultReferences.push({ id: match[1], title: match[2], type: match[3] });
    }

    const uniqueRefs = Array.from(new Map(parsedVaultReferences.map(item => [item.id, item])).values());

    // Replace Format 1 with empty string
    currentText = currentText.replace(/\[vault-reference:[^\]]+\]/g, '');
    
    // Replace Format 2 with just the bracketed label
    currentText = currentText.replace(/\[([^\]]+)\]\(vault-reference:[^\)]+\)/g, '$1');

    return { displayText: currentText, uniqueReferences: uniqueRefs };
  }, [message]);

  let text = displayText;
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

  const youtubeInvocations = (message as any)?.toolInvocations?.filter(
    (ti: any) => ti.state === 'result' && ['youtubeSearch', 'youtubeGetVideo'].includes(ti.toolName) && ti.result && !('error' in ti.result)
  );

  const browserInvocations = (message as any)?.toolInvocations?.filter(
    (ti: any) => ti.toolName === 'browserControl'
  );

  const vaultActionInvocations = (message as any)?.toolInvocations?.filter(
    (ti: any) => ti.state === 'result' && ['createVaultItem', 'updateVaultItem'].includes(ti.toolName) && ti.result && !('error' in ti.result)
  );

  const toolInvocations = (message as any)?.toolInvocations;
  const textVideoIds = useMemo(() => extractYouTubeVideoIds(text), [text]);

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
      youtubeSearch: "Searching YouTube",
      youtubeGetVideo: "Fetching video",
      youtubeGetChannel: "Fetching channel",
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
              <ReasoningTrigger className="py-2 px-1 text-app-text-muted hover:text-app-text-soft" />
              <ReasoningContent className="py-4 px-1 text-app-text-soft leading-relaxed max-w-2xl">
                <div className="flex flex-col gap-3">
                  {/* AI Reasoning Text */}
                  {getMessageReasoning(message) && (
                    <div className="text-sm border-l-2 border-app-border-default pl-4 py-1 italic mb-2">
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
                            <span className="text-xs font-medium tracking-tight text-app-text-soft">
                              {getToolLabel(ti.toolName, ti.state)}
                            </span>
                          </div>

                          {/* Tool Details (Args/Result) */}
                          <div className="text-[10px] opacity-70 ml-4 font-mono max-w-[600px] overflow-x-auto rounded bg-white/5 p-2 mt-1">
                            {ti.state === 'call' ? (
                              <pre className="whitespace-pre-wrap break-words">args: {JSON.stringify(ti.args, null, 2)}</pre>
                            ) : (
                              <pre className={`whitespace-pre-wrap break-words ${ti.result?.error ? 'text-red-400' : 'text-green-500/80'}`}>
                                {ti.result?.error ? `Error: ${ti.result.error}` : `Result: ${JSON.stringify(ti.result, null, 2)}`}
                              </pre>
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
          <MessageContent className={message?.role === 'user' ? 'group-[.is-user]:bg-app-surface group-[.is-user]:text-app-text-secondary group-[.is-user]:rounded-[25px_25px_0px_25px] group-[.is-user]:border group-[.is-user]:border-app-border-subtle group-[.is-user]:shadow-2xl' : 'text-app-text-secondary'}>
            {isEditing ? (
              <div className="flex flex-col w-full min-w-[400px] p-0">
                <textarea
                  autoFocus
                  className="w-full bg-transparent border-none text-base text-app-text-secondary outline-none resize-none min-h-[80px] placeholder:text-app-text-faint"
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
                    title="cancel"
                    className="px-4 py-1.5 rounded-full border border-white/5 text-app-text-primary text-sm font-medium hover:bg-app-canvas/80 transition-all active:scale-95 cursor-pointer"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    title="send"
                    className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95 shadow-lg cursor-pointer"
                    onClick={() => {
                      onEditMessage?.(message.id, editingContent);
                      setEditingId(null);
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <MessageResponse isAnimating={isLastStreaming} className={`prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#050505] prose-pre:border prose-pre:border-app-border-subtle ${message.role === 'assistant' ? 'prose-lg' : 'prose-base'}`}>
                {text}
              </MessageResponse>
            )}

            {!isEditing && weatherInvocations?.map((invocation: any) => (
              <WeatherCard key={invocation.toolCallId} data={invocation.result as any} />
            ))}

            {!isEditing && youtubeInvocations?.map((invocation: any) => (
              <YouTubeCard key={invocation.toolCallId} data={invocation.result as any} />
            ))}

            {!isEditing && textVideoIds.length > 0 && (
              <YouTubeCard data={{ videos: textVideoIds.map(id => ({ videoId: id })) }} />
            )}

            {!isEditing && vaultActionInvocations?.map((invocation: any) => (
              <VaultCard key={invocation.toolCallId} data={invocation.result as any} action={invocation.toolName === 'updateVaultItem' ? 'update' : 'create'} />
            ))}

            {!isEditing && uniqueReferences.map((ref, idx) => (
              <VaultReferenceCard key={`${ref.id}-${idx}`} id={ref.id} title={ref.title} type={ref.type} />
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
                  }} className="rounded-xl border border-app-border-subtle bg-app-surface-glass p-1 hover:border-primary/30 transition-all">
                    <AttachmentPreview />
                  </Attachment>
                ))}
              </Attachments>
            )}
          </MessageContent>

          {!(message.role === 'assistant' && isLastStreaming) && (
            <MessageToolbar className={cn(
              "mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0",
              message.role === 'user' && "justify-end"
            )}>
              <MessageActions className="bg-white dark:bg-[#080808] p-1 rounded-full border border-app-border-subtle shadow-xl">
                <MessageAction tooltip="Copy message" onClick={() => copyToClipboard(text)} className="hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer">
                  <Copy size={13} />
                </MessageAction>
                {message.role === 'assistant' && <MessageAction tooltip="Save to memory" onClick={() => onSaveMemory(text)} className="hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full cursor-pointer">
                  <Brain size={13} />
                </MessageAction>}
                {message.role === 'user' && !editingId && (
                  <>
                    <MessageAction tooltip="Try again" onClick={() => regenerate({ body: { model: selectedModel } })} className="hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer">
                      <RotateCcw size={13} />
                    </MessageAction>
                    <MessageAction
                      tooltip="Edit message"
                      className="hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer"
                      onClick={() => {
                        setEditingId(message.id);
                        setEditingContent(text);
                      }}
                    >
                      <Pencil size={13} />
                    </MessageAction>
                    <MessageAction tooltip="Delete message" onClick={() => setDeletingMessageId(message.id)} className="hover:text-red-400 hover:bg-red-400/10 rounded-full cursor-pointer">
                      <Trash2 size={13} />
                    </MessageAction>
                  </>
                )}
                {message.role === 'assistant' && (
                  <>
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
          )}
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

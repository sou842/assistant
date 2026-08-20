import { Terminal, Brain, Globe, FileText, Hourglass, MousePointer2, Code, Search, Keyboard, Info, ChevronDown, OctagonAlert, Copy, Edit2, Trash, CheckCircle2, Rocket, AlertTriangle, XCircle, Loader2, Maximize2, ChevronsDownUp, ArrowRightLeft, Workflow, AppWindow, Chrome, RotateCcw, StickyNote, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Message, MessageContent, MessageResponse, MessageToolbar, MessageAction, MessageActions } from "@/components/ai-elements/message";
import { useState, useMemo } from "react";

function ChatMessageItem({ 
  msg, 
  i, 
  editingIndex, 
  setEditingIndex, 
  editingText, 
  setEditingText, 
  handleSaveEdit, 
  handleCopy, 
  handleDeleteMessage,
  handleRetryMessage
}: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const MAX_LENGTH = 1000;
  const isLong = msg.text.length > MAX_LENGTH;
  const isEditing = editingIndex === i;
  const isUser = msg?.role === 'user';

  const handleExpandToggle = () => {
    if (!isExpanded) {
      setIsExpanding(true);
      setTimeout(() => {
        setIsExpanded(true);
        setIsExpanding(false);
      }, 50);
    } else {
      setIsExpanded(false);
    }
  };

  const special = useMemo(() => {
    return [
      { prefix: '🛑', Icon: OctagonAlert, className: 'text-red-400 opacity-80' },
      { prefix: '✅', Icon: CheckCircle2, className: 'text-green-400 opacity-60' },
      { prefix: '🚀', Icon: Rocket, className: 'text-blue-400 opacity-60' },
      { prefix: '⚠️', Icon: AlertTriangle, className: 'text-yellow-400 opacity-80' },
      { prefix: '❌', Icon: XCircle, className: 'text-red-400 opacity-60' },
      { prefix: '📡', Icon: WifiOff, className: 'text-red-400 opacity-80' }
    ].find(item => msg.text.startsWith(item.prefix));
  }, [msg.text]);

  const contentToRender = useMemo(() => {
    let text = special ? msg.text.replace(special.prefix, '').trim() : msg.text;
    if (isLong && !isExpanded) {
      return text.substring(0, MAX_LENGTH) + "...";
    }
    return text;
  }, [msg.text, special, isLong, isExpanded]);

  return (
    <Message key={i} from={msg.role as any} className={isUser ? 'max-w-[85%] ml-auto' : 'w-full'}>
      <div className={`flex gap-6 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full max-w-md bg-app-surface border border-app-border-default/20 rounded-xl p-3 shadow-sm">
              <textarea
                className="w-full bg-transparent text-sm text-app-text-primary outline-none resize-none pb-2 focus:border-brand-primary/30 font-sans"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingIndex(null)} className="text-[10px] bg-app-surface-elevated hover:bg-app-surface-hover px-2 py-1 rounded-full text-app-text-muted transition cursor-pointer">Cancel</button>
                <button onClick={() => handleSaveEdit(i)} className="text-[10px] bg-brand-primary hover:bg-brand-primary/95 px-2 py-1 rounded-full text-white font-medium transition cursor-pointer">Save</button>
              </div>
            </div>
          ) : (
            <MessageContent className={isUser ? 'group-[.is-user]:bg-brand-primary group-[.is-user]:text-white group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-sm group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-[13px] group-[.is-user]:leading-relaxed group-[.is-user]:shadow-sm' : 'bg-app-surface border border-app-border-default/10 text-app-text-primary rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] leading-relaxed shadow-xs'}>
              {isUser ? (
                <div className="flex flex-col gap-1.5 items-end">
                  {msg.tags && msg.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end w-full">
                      {msg.tags.map((tag: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 bg-white/20 border border-white/10 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shadow-sm">
                          {tag.type === 'w' ? <Workflow size={10} className="opacity-80" /> : tag.type === 't' ? <AppWindow size={10} className="opacity-80" /> : <Globe size={10} className="opacity-80" />}
                          <span className="truncate max-w-37.5">{tag.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span>{msg.text}</span>
                </div>
              ) : (() => {
                if (special) {
                  const IconComponent = special.Icon;
                  return (
                    <div className="flex items-start gap-2 w-full max-w-full overflow-x-auto">
                      <IconComponent size={15} className={cn("shrink-0 mt-0.5", special.className)} />
                      <div className="w-full max-w-full">
                        <MessageResponse className="w-full max-w-full prose dark:prose-invert overflow-x-auto prose-sm prose-p:leading-snug prose-pre:bg-app-surface-elevated prose-pre:border prose-pre:border-app-border-default/20 prose-a:text-brand-primary text-app-text-primary prose-p:text-app-text-secondary prose-headings:text-app-text-primary prose-strong:text-app-text-primary prose-ol:text-app-text-secondary prose-ul:text-app-text-secondary prose-li:text-app-text-secondary">
                          {contentToRender}
                        </MessageResponse>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="w-full max-w-full overflow-x-auto">
                    <MessageResponse className="w-full max-w-full prose dark:prose-invert overflow-x-auto prose-sm prose-p:leading-snug prose-pre:bg-app-surface-elevated prose-pre:border prose-pre:border-app-border-default/20 prose-a:text-brand-primary text-app-text-primary prose-p:text-app-text-secondary prose-headings:text-app-text-primary prose-strong:text-app-text-primary prose-ol:text-app-text-secondary prose-ul:text-app-text-secondary prose-li:text-app-text-secondary">
                      {contentToRender}
                    </MessageResponse>
                  </div>
                );
              })()}
            </MessageContent>
          )}

          {!isEditing && (
            <MessageToolbar className={cn(
              "mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0",
              isUser && "justify-end"
            )}>
              <MessageActions className="bg-app-surface-elevated/90 border border-app-border-default/20 px-1 py-0 rounded-full backdrop-blur-sm shadow-sm flex gap-1 items-center">
                {isLong && !isUser && (
                  <MessageAction tooltip={isExpanded ? "Collapse" : "Expand"} onClick={handleExpandToggle} className="p-1 hover:bg-app-surface-hover text-app-text-muted hover:text-app-text-primary rounded transition cursor-pointer flex items-center gap-1 px-2 animate-none" variant="ghost" size="icon-sm">
                    {isExpanding ? <Loader2 size={8} className="animate-spin" /> : (!isExpanded ? <Maximize2 size={8} /> : <ChevronsDownUp size={8} />)}
                  </MessageAction>
                )}
                <MessageAction tooltip="Copy" onClick={() => handleCopy(msg.text)} className="p-0.5 hover:bg-app-surface-hover text-app-text-muted hover:text-app-text-primary rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                  <Copy size={6} />
                </MessageAction>
                {isUser && (
                  <>
                    <MessageAction tooltip="Retry" onClick={() => handleRetryMessage(i)} className="p-0.5 hover:bg-app-surface-hover text-app-text-muted hover:text-app-text-primary rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                      <RotateCcw size={6} />
                    </MessageAction>
                    <MessageAction tooltip="Edit" onClick={() => { setEditingIndex(i); setEditingText(msg.text); }} className="p-0.5 hover:bg-app-surface-hover text-app-text-muted hover:text-app-text-primary rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                      <Edit2 size={6} />
                    </MessageAction>
                  </>
                )}
                <MessageAction tooltip="Delete" onClick={() => handleDeleteMessage(i)} className="p-0.5 hover:bg-app-danger-soft text-app-text-muted hover:text-app-danger-strong rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                  <Trash size={6} />
                </MessageAction>
              </MessageActions>
            </MessageToolbar>
          )}
        </div>
      </div>
    </Message>
  );
}

export function ChatTab({
  activeTab,
  chatHistory,
  isAgentRunning,
  editingIndex,
  setEditingIndex,
  editingText,
  setEditingText,
  handleSaveEdit,
  handleCopy,
  handleDeleteMessage,
  handleRetryMessage,
  chatEndRef
}: any) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${activeTab === "chat" ? "block" : "hidden"}`}>
      {chatHistory?.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
            <Chrome className="text-brand-primary" size={24} strokeWidth={1.5} />
          </div>
          <p className="text-xs text-app-text-muted max-w-[280px] leading-relaxed">Hello! I am your Jarvis Agent. Type any command below to control this browser tab.</p>
        </div>
      ) : (
        (() => {
          const groupedHistory: any[] = [];
          let currentGroup: any = null;

          const AGENT_STEP_CONFIG = [
            { match: (text: string) => text.includes('📝 User note received:'), Icon: StickyNote, clean: (text: string) => text.replace('💡 *Thinking:*', '').replace('📝 User note received:', '').trim() },
            { match: (text: string) => text.startsWith('💡 *Thinking:*'), Icon: Brain, clean: (text: string) => text.replace('💡 *Thinking:*', '').trim() },
            { match: (text: string) => text.startsWith('🌐'), Icon: Globe, clean: (text: string) => text.replace('🌐', '').trim() },
            { match: (text: string) => text.startsWith('📄'), Icon: FileText, clean: (text: string) => text.replace('📄', '').trim() },
            { match: (text: string) => text.startsWith('⏳'), Icon: Hourglass, clean: (text: string) => text.replace('⏳', '').trim() },
            { match: (text: string) => text.startsWith('🖱️'), Icon: MousePointer2, clean: (text: string) => text.replace('🖱️', '').trim() },
            { match: (text: string) => text.startsWith('🧠'), Icon: Code, clean: (text: string) => text.replace('🧠', '').trim() },
            { match: (text: string) => text.startsWith('🔍'), Icon: Search, clean: (text: string) => text.replace('🔍', '').trim() },
            { match: (text: string) => text.startsWith('⌨️') || text.startsWith('✏️'), Icon: Keyboard, clean: (text: string) => text.replace(/⌨️|✏️/, '').trim() },
            { match: (text: string) => text.startsWith('🔄'), Icon: ArrowRightLeft, clean: (text: string) => text.replace('🔄', '').trim() },
            { match: (text: string) => text.startsWith('🚨'), Icon: AlertTriangle, className: "text-red-400 group-hover/step:text-red-300", clean: (text: string) => text.replace('🚨', '').trim() },
            { match: (text: string) => text.startsWith('🗑️'), Icon: Trash, clean: (text: string) => text.replace('🗑️', '').trim() },
          ];

          const ACTION_LOG_PREFIXES = [
            '💡', '🌐', '📄', '⏳', '🖱️', '✏️', '🔍', '🧠', '⚙️', '📹', '⚡', '👉', '📜', '🔄', '🚨', '🗑️',
            'Opening new tab', 'Navigating current tab', 'Waiting for'
          ];

          const renderAgentStep = (text: string) => {
            const config = AGENT_STEP_CONFIG.find(c => c.match(text));
            const Icon = config ? config.Icon : Info;
            const cleanText = config 
              ? config.clean(text)
              : text.replace(/^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();

            return (
              <div className="flex gap-3 items-start group/step -ml-4">
                <span className="p-1 rounded-full bg-app-canvas border border-app-border-default/10 shadow-xs">
                  <Icon size={13} className={cn("mt-[2px] rounded shrink-0 transition-colors text-app-text-ghost group-hover/step:text-app-text-primary")} />
                </span>
                <span className={cn("whitespace-pre-wrap leading-relaxed text-xs text-app-text-secondary")}>{cleanText}</span>
              </div>
            );
          };

          chatHistory?.forEach((msg: any, idx: number) => {
            const isFinalAnswer = msg.text.startsWith('✅') || msg.text.startsWith('❌') || msg.text.startsWith('⚠️') || msg.text.startsWith('🛑');
            const isUser = msg?.role === 'user';
            const isSystemMessage = msg.text.startsWith('🚀 **Starting');

            const isActionLog = msg.role === 'agent' && ACTION_LOG_PREFIXES.some(prefix => msg.text.startsWith(prefix));

            if (isUser || isFinalAnswer || isSystemMessage || (msg.role === 'agent' && !isActionLog)) {
              if (currentGroup) {
                groupedHistory.push({ type: 'group', items: currentGroup });
                currentGroup = null;
              }
              groupedHistory.push({ type: 'message', msg, originalIndex: idx });
            } else if (msg.role === 'agent' && isActionLog) {
              if (!currentGroup) currentGroup = [];
              currentGroup.push({ msg, originalIndex: idx });
            }
          });

          if (currentGroup) {
            groupedHistory.push({ type: 'group', items: currentGroup });
          }

          return groupedHistory?.map((group, groupIdx) => {
            if (group.type === 'message') {
              const { msg, originalIndex: i } = group;
              if (msg.text.includes("Stopped by user")) {
                return (
                  <div key={i} className="flex items-center my-6 w-full select-none">
                    <div className="grow border-t border-app-border-default/20"></div>
                    <span className="mx-4 text-[10px] font-medium tracking-wider text-app-text-ghost rounded-full">
                      Stopped by user
                    </span>
                    <div className="grow border-t border-app-border-default/20"></div>
                  </div>
                );
              }
              return (
                <ChatMessageItem
                  key={i}
                  msg={msg}
                  i={i}
                  editingIndex={editingIndex}
                  setEditingIndex={setEditingIndex}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  handleSaveEdit={handleSaveEdit}
                  handleCopy={handleCopy}
                  handleDeleteMessage={(idx: number) => setDeleteIndex(idx)}
                  handleRetryMessage={handleRetryMessage}
                />
              );
            } else {
              return (
                <div key={`group-${groupIdx}`} className="flex flex-col self-start items-start w-full my-1 pb-2">
                  <details
                    className="group text-[13px] text-app-text-muted w-full"
                    open={isAgentRunning && groupIdx === groupedHistory.length - 1 ? true : undefined}
                  >
                    <summary className="flex items-center justify-start gap-2 cursor-pointer font-medium select-none text-app-text-muted hover:text-app-text-primary list-none [&::-webkit-details-marker]:hidden mb-3">
                      <Brain size={14} className="text-app-text-ghost shrink-0" />
                      <span className="text-xs">Chain of Thought</span>
                      <span className="text-[10px] text-app-text-ghost group-open:rotate-180 transition-transform"><ChevronDown className="size-4" /></span>
                    </summary>
                    <div className="space-y-3 pl-1.25 border-l border-app-border-default/15 ml-1.5">
                      {group?.items?.map((item: any) => (
                        <div key={item?.originalIndex}>
                          {renderAgentStep(item?.msg?.text)}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            }
          });
        })()
      )}
      
      {isAgentRunning && chatHistory?.length > 0 && chatHistory[chatHistory?.length - 1]?.role === 'user' && (
        <Message from="agent" className="w-full">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0 flex flex-col items-start">
              <MessageContent>
                <div className="flex items-center gap-2.5">
                  <Loader2 size={13} className="animate-spin text-brand-primary" />
                  <span className="text-[13px] text-app-text-muted font-medium">Thinking...</span>
                </div>
              </MessageContent>
            </div>
          </div>
        </Message>
      )}

      {deleteIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-default"
          onClick={() => setDeleteIndex(null)}
        >
          <div 
            className="bg-app-surface border border-app-border-default/20 rounded-2xl p-5 max-w-xs w-full mx-4 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-sm text-app-text-primary">Delete Messages</h3>
            </div>
            
            <p className="text-xs text-app-text-muted leading-relaxed">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            
            <div className="flex gap-2.5 justify-end pt-2">
              <button
                onClick={() => setDeleteIndex(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-app-text-muted hover:text-app-text-primary bg-app-surface-elevated hover:bg-app-surface-hover border border-app-border-default/20 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteMessage(deleteIndex);
                  setDeleteIndex(null);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}

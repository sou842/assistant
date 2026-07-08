import { Terminal, Brain, Globe, FileText, Hourglass, MousePointer2, Code, Search, Keyboard, Info, ChevronDown, OctagonAlert, Copy, Edit2, Trash, CheckCircle2, Rocket, AlertTriangle, XCircle, Loader2, Maximize2, ChevronsDownUp } from "lucide-react";
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
  handleDeleteMessage 
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
      { prefix: '❌', Icon: XCircle, className: 'text-red-400 opacity-60' }
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
    <Message key={i} from={msg.role as any} className={isUser ? 'max-w-[85%]' : 'w-full'}>
      <div className={`flex gap-6 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-md">
              <textarea
                className="w-full bg-transparent text-sm text-gray-200 outline-none resize-none border-b border-white/5 pb-2 focus:border-blue-500/30 font-sans"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingIndex(null)} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded-full text-gray-400 transition cursor-pointer">Cancel</button>
                <button onClick={() => handleSaveEdit(i)} className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded-full text-white font-medium transition cursor-pointer">Save</button>
              </div>
            </div>
          ) : (
            <MessageContent className={isUser ? 'group-[.is-user]:bg-blue-600 group-[.is-user]:text-white group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-sm group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-[13px] group-[.is-user]:leading-relaxed group-[.is-user]:shadow-sm' : 'bg-[#1a1a1a] border border-white/5 text-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] leading-relaxed shadow-sm'}>
              {isUser ? (
                msg.text
              ) : (() => {
                if (special) {
                  const IconComponent = special.Icon;
                  return (
                    <div className="flex items-start gap-2 w-full max-w-full overflow-x-auto">
                      <IconComponent size={15} className={cn("shrink-0 mt-[2px]", special.className)} />
                      <div className="w-full max-w-full">
                        <MessageResponse className="w-full max-w-full prose prose-invert overflow-x-auto prose-sm prose-p:leading-snug prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-a:text-blue-400">
                          {contentToRender}
                        </MessageResponse>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="w-full max-w-full overflow-x-auto">
                    <MessageResponse className="w-full max-w-full prose prose-invert overflow-x-auto prose-sm prose-p:leading-snug prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-a:text-blue-400">
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
              <MessageActions className="bg-black/80 border border-white/10 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-xl flex gap-1 items-center">
                {isLong && !isUser && (
                  <MessageAction tooltip={isExpanded ? "Collapse" : "Expand"} onClick={handleExpandToggle} className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition cursor-pointer flex items-center gap-1 px-2" variant="ghost" size="icon-sm">
                    {isExpanding ? <Loader2 size={10} className="animate-spin" /> : (!isExpanded ? <Maximize2 size={10} /> : <ChevronsDownUp size={10} />)}
                    {/* <span className="text-[10px] font-medium">{isExpanded ? "Show Less" : "Show More"}</span> */}
                  </MessageAction>
                )}
                <MessageAction tooltip="Copy" onClick={() => handleCopy(msg.text)} className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                  <Copy size={8} />
                </MessageAction>
                {isUser && (
                  <MessageAction tooltip="Edit" onClick={() => { setEditingIndex(i); setEditingText(msg.text); }} className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                    <Edit2 size={8} />
                  </MessageAction>
                )}
                <MessageAction tooltip="Delete" onClick={() => handleDeleteMessage(i)} className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                  <Trash size={8} />
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
  chatEndRef
}: any) {
  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${activeTab === "chat" ? "block" : "hidden"}`}>
      {chatHistory.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Terminal className="text-blue-400" size={24} />
          </div>
          <p className="text-sm text-gray-400">Hello! I am your Jarvis Agent. Type any command below to control this browser tab.</p>
        </div>
      ) : (
        (() => {
          const groupedHistory: any[] = [];
          let currentGroup: any = null;

          const AGENT_STEP_CONFIG = [
            { match: (text: string) => text.startsWith('💡 *Thinking:*'), Icon: Brain, clean: (text: string) => text.replace('💡 *Thinking:*', '').trim() },
            { match: (text: string) => text.startsWith('🌐'), Icon: Globe, clean: (text: string) => text.replace('🌐', '').trim() },
            { match: (text: string) => text.startsWith('📄'), Icon: FileText, clean: (text: string) => text.replace('📄', '').trim() },
            { match: (text: string) => text.startsWith('⏳'), Icon: Hourglass, clean: (text: string) => text.replace('⏳', '').trim() },
            { match: (text: string) => text.startsWith('🖱️'), Icon: MousePointer2, clean: (text: string) => text.replace('🖱️', '').trim() },
            { match: (text: string) => text.startsWith('🧠'), Icon: Code, clean: (text: string) => text.replace('🧠', '').trim() },
            { match: (text: string) => text.startsWith('🔍'), Icon: Search, clean: (text: string) => text.replace('🔍', '').trim() },
            { match: (text: string) => text.startsWith('⌨️') || text.startsWith('✏️'), Icon: Keyboard, clean: (text: string) => text.replace(/⌨️|✏️/, '').trim() },
          ];

          const ACTION_LOG_PREFIXES = [
            '💡', '🌐', '📄', '⏳', '🖱️', '✏️', '🔍', '🧠', '⚙️', '📹', '⚡', '👉', '📜',
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
                <span className="p-1 rounded-full bg-[#0a0a0a]">
                  <Icon size={13} className="text-gray-500 mt-[2px] rounded shrink-0 group-hover/step:text-gray-300 transition-colors" />
                </span>
                <span className="whitespace-pre-wrap leading-relaxed">{cleanText}</span>
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
                  handleDeleteMessage={handleDeleteMessage}
                />
              );
            } else {
              return (
                <div key={`group-${groupIdx}`} className="flex flex-col self-start items-start w-full my-1 pb-2">
                  <details
                    className="group text-[13px] text-gray-400 w-full"
                    open={isAgentRunning && groupIdx === groupedHistory.length - 1 ? true : undefined}
                  >
                    <summary className="flex items-center justify-start gap-2 cursor-pointer font-medium select-none text-gray-400 hover:text-gray-200 list-none [&::-webkit-details-marker]:hidden mb-3">
                      <Brain size={14} className="text-gray-500 shrink-0" />
                      <span>Chain of Thought</span>
                      <span className="text-[10px] text-gray-600 group-open:rotate-180 transition-transform"><ChevronDown className="size-4" /></span>
                    </summary>
                    <div className="space-y-3 pl-[5px] border-l border-white/5 ml-[6px]">
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
      <div ref={chatEndRef} />
    </div>
  );
}

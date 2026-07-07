import { Terminal, Brain, Globe, FileText, Hourglass, MousePointer2, Code, Search, Keyboard, Info, ChevronDown, OctagonAlert, Copy, Edit2, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Message, MessageContent, MessageResponse, MessageToolbar, MessageAction, MessageActions } from "@/components/ai-elements/message";

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

          const renderAgentStep = (text: string) => {
            let Icon = Brain;
            let cleanText = text;

            if (text.startsWith('💡 *Thinking:*')) {
              Icon = Brain;
              cleanText = text.replace('💡 *Thinking:*', '').trim();
            } else if (text.startsWith('🌐')) {
              Icon = Globe;
              cleanText = text.replace('🌐', '').trim();
            } else if (text.startsWith('📄')) {
              Icon = FileText;
              cleanText = text.replace('📄', '').trim();
            } else if (text.startsWith('⏳')) {
              Icon = Hourglass;
              cleanText = text.replace('⏳', '').trim();
            } else if (text.startsWith('🖱️')) {
              Icon = MousePointer2;
              cleanText = text.replace('🖱️', '').trim();
            } else if (text.startsWith('🧠')) {
              Icon = Code;
              cleanText = text.replace('🧠', '').trim();
            } else if (text.startsWith('🔍')) {
              Icon = Search;
              cleanText = text.replace('🔍', '').trim();
            } else if (text.startsWith('⌨️') || text.startsWith('✏️')) {
              Icon = Keyboard;
              cleanText = text.replace(/⌨️|✏️/, '').trim();
            } else {
              Icon = Info;
              cleanText = text.replace(/^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
            }

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
            const isUser = msg.role === 'user';
            const isSystemMessage = msg.text.startsWith('🚀 **Starting');

            const isActionLog = msg.role === 'agent' && (
              msg.text.startsWith('💡') ||
              msg.text.startsWith('🌐') ||
              msg.text.startsWith('📄') ||
              msg.text.startsWith('⏳') ||
              msg.text.startsWith('🖱️') ||
              msg.text.startsWith('✏️') ||
              msg.text.startsWith('🔍') ||
              msg.text.startsWith('🧠') ||
              msg.text.startsWith('⚙️') ||
              msg.text.startsWith('📹') ||
              msg.text.startsWith('⚡') ||
              msg.text.startsWith('👉') ||
              msg.text.startsWith('📜') ||
              msg.text.startsWith('Opening new tab') ||
              msg.text.startsWith('Navigating current tab') ||
              msg.text.startsWith('Waiting for')
            );

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

          return groupedHistory.map((group, groupIdx) => {
            if (group.type === 'message') {
              const { msg, originalIndex: i } = group;
              const isEditing = editingIndex === i;

              return (
                <Message key={i} from={msg.role as any} className="max-w-[85%] w-full">
                  <div className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 min-w-0 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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
                        <MessageContent className={msg.role === 'user' ? 'group-[.is-user]:bg-blue-600 group-[.is-user]:text-white group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-sm group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-[13px] group-[.is-user]:leading-relaxed group-[.is-user]:shadow-sm' : 'bg-[#1a1a1a] border border-white/5 text-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-[13px] leading-relaxed shadow-sm'}>
                          {msg.role === 'user' ? (
                            msg.text
                          ) : msg.text.startsWith('🛑') ? (
                            <div className="flex items-start gap-2">
                              <OctagonAlert size={15} className="shrink-0 mt-[2px] text-red-400 opacity-80" />
                              <div>
                                <MessageResponse className="prose prose-invert max-w-none prose-sm prose-p:leading-snug prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-a:text-blue-400">
                                  {msg.text.replace('🛑', '').trim()}
                                </MessageResponse>
                              </div>
                            </div>
                          ) : (
                            <MessageResponse className="prose prose-invert max-w-none prose-sm prose-p:leading-snug prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-a:text-blue-400">
                              {msg.text}
                            </MessageResponse>
                          )}
                        </MessageContent>
                      )}

                      {!isEditing && (
                        <MessageToolbar className={cn(
                          "mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0",
                          msg.role === 'user' && "justify-end"
                        )}>
                          <MessageActions className="bg-black/80 border border-white/10 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-xl flex gap-1">
                            <MessageAction tooltip="Copy" onClick={() => handleCopy(msg.text)} className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded transition cursor-pointer" variant="ghost" size="icon-sm">
                              <Copy size={8} />
                            </MessageAction>
                            {msg.role === 'user' && (
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

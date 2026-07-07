"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Terminal, Settings, Play, Info, Square, Trash, History, Plus, X, MessageSquare, Brain, Copy, Edit2, Globe, FileText, Hourglass, MousePointer2, Code, Search, Keyboard, ChevronDown, OctagonAlert } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

export default function ExtensionPanel() {
  const [activeTab, setActiveTab] = useState<"chat" | "workflows">("chat");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("mistral-small-latest");
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, any>>({});
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleDeleteMessage = (index: number) => {
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "DELETE_MESSAGE", index }, "*");
  };

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return;
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "EDIT_MESSAGE", index, text: editingText }, "*");
    setEditingIndex(null);
    setEditingText("");
  };

  // Message Bridge Setup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "FROM_EXTENSION") {
        if (data.action === "UPDATE_STATE") {
          if (data.history) setChatHistory(data.history);
          if (data.savedChats) setSavedChats(data.savedChats);
          if (data.isAgentRunning !== undefined) setIsAgentRunning(data.isAgentRunning);
          if (data.currentTokenUsage !== undefined) setTokenUsage(data.currentTokenUsage);
        } else if (data.action === "WORKFLOW_RESULT") {
          if (data.success) {
            toast.success("Workflow completed successfully!");
          } else {
            toast.error("Workflow failed: " + data.error);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Request initial state on mount
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "REQUEST_INITIAL_STATE" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Fetch workflows
  useEffect(() => {
    if (activeTab === "workflows") {
      fetch("/api/workflows")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWorkflows(data.data);
          } else {
            toast.error("Failed to load workflows");
          }
        })
        .catch(() => toast.error("Network error fetching workflows"));
    }
  }, [activeTab]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const sendMessage = () => {
    if (!input.trim()) return;

    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "RUN_AGENT",
      prompt: input,
      model: model
    }, "*");

    setInput("");
  };

  const clearChat = () => {
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "CLEAR_CHAT_HISTORY" }, "*");
  };

  const runWorkflow = (w: any) => {
    let inputsObj = {};
    const rawInputs = workflowInputs[w._id];
    if (rawInputs) {
      if (typeof rawInputs === 'string') {
        try {
          inputsObj = JSON.parse(rawInputs);
        } catch (e: any) {
          toast.error("Invalid JSON format in inputs: " + e.message);
          return;
        }
      } else {
        inputsObj = rawInputs;
      }
    }

    // Switch to chat tab to watch execution logs
    setActiveTab("chat");

    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "RUN_WORKFLOW",
      script: w.script,
      inputs: inputsObj,
      messageId: Date.now().toString()
    }, "*");
  };

  const stopAgent = () => {
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "STOP_AGENT" }, "*");
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40 backdrop-blur-md relative z-20">
        <button
          onClick={() => {
            window.parent.postMessage({ type: "FROM_NEXTJS", action: "NEW_CHAT" }, "*");
            setShowHistory(false);
          }}
          className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-full transition cursor-pointer"
        >
          <Plus size={14} /> New Chat
        </button>
        <div className="flex items-center gap-2">
          <h1 className="font-semibold tracking-tight text-sm text-gray-200">Jarvis Agent</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-md transition ${showHistory ? 'bg-blue-600/30 text-blue-400' : 'hover:bg-white/10 text-gray-400'}`}
            title="Chat History"
          >
            <History size={14} />
          </button>
        </div>
      </header>

      {/* History Slide-over Panel */}
      <div className={`fixed inset-0 top-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md z-50 transition-transform duration-300 flex flex-col ${showHistory ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/50">
          <button
            onClick={() => {
              window.parent.postMessage({ type: "FROM_NEXTJS", action: "NEW_CHAT" }, "*");
              setShowHistory(false);
            }}
            className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-full transition cursor-pointer"
          >
            <Plus size={14} /> New Chat
          </button>
          <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Conversations</span>
          <button
            onClick={() => {
              setShowHistory(false);
            }}
            className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-full transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedChats.length === 0 ? (
            <div className="text-center text-xs text-gray-500 mt-10">No saved conversations.</div>
          ) : (
            savedChats?.map(chat => (
              <div
                key={chat.id}
                className="flex items-center justify-between py-2 px-4 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer group transition cursor-pointer"
                onClick={() => {
                  window.parent.postMessage({ type: "FROM_NEXTJS", action: "LOAD_CHAT", chatId: chat.id }, "*");
                  setShowHistory(false);
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare size={12} className="text-gray-500 shrink-0" />
                  <span className="text-xs text-gray-300 truncate">{chat.title || "New Chat"}</span>
                </div>
                <button onClick={(e) => {
                  e.stopPropagation();
                  window.parent.postMessage({ type: "FROM_NEXTJS", action: "DELETE_CHAT", chatId: chat.id }, "*");
                }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded transition shrink-0">
                  <Trash size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-white/10 shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${activeTab === "chat" ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("workflows")}
          className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${activeTab === "workflows" ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
        >
          Workflows
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">

        {/* Chat Tab */}
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
              const groupedHistory = [];
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

              chatHistory?.forEach((msg, idx) => {
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

        {/* Workflows Tab */}
        <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${activeTab === "workflows" ? "block" : "hidden"}`}>
          {workflows.length === 0 ? (
            <div className="text-center text-xs text-gray-500 mt-10">No workflows found.</div>
          ) : (
            workflows.map(w => (
              <div key={w._id} className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-md">
                <div
                  className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 transition"
                  onClick={() => setExpandedWorkflow(expandedWorkflow === w._id ? null : w._id)}
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-200">{w.title}</h3>
                    {w.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{w.description}</p>}
                  </div>
                </div>

                {expandedWorkflow === w._id && (
                  <div className="p-3 border-t border-white/5 bg-black/20 space-y-3">
                    {w.inputs && Array.isArray(w.inputs) && w.inputs.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase">Workflow Inputs</div>
                        {w.inputs.map((inputSchema: any, idx: number) => {
                          const val = (workflowInputs[w._id] || {})[inputSchema.name] || '';
                          return (
                            <div key={idx} className="flex flex-col gap-1">
                              <label className="text-xs text-gray-300 font-medium">
                                {inputSchema.label || inputSchema.name}
                              </label>
                              {inputSchema.type === 'largetext' ? (
                                <textarea
                                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs text-gray-300 resize-none outline-none focus:border-blue-500/50"
                                  rows={3}
                                  value={val}
                                  onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.value } })}
                                />
                              ) : inputSchema.type === 'select' ? (
                                <select
                                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs text-gray-300 outline-none focus:border-blue-500/50"
                                  value={val}
                                  onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.value } })}
                                >
                                  <option value="">Select an option...</option>
                                  {(inputSchema.options || []).map((opt: string) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : inputSchema.type === 'boolean' ? (
                                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="accent-blue-600 rounded bg-[#0a0a0a] border-white/10"
                                    checked={!!val}
                                    onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.checked } })}
                                  />
                                  <span>Enable {inputSchema.label || inputSchema.name}</span>
                                </label>
                              ) : (
                                <input
                                  type="text"
                                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs text-gray-300 outline-none focus:border-blue-500/50"
                                  value={val}
                                  onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.value } })}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono mb-1">INPUTS (JSON)</div>
                        <textarea
                          className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs font-mono text-gray-300 resize-none h-16 outline-none focus:border-blue-500/50"
                          placeholder={'{"url": "https://..."}'}
                          value={typeof workflowInputs[w._id] === 'string' ? workflowInputs[w._id] : ''}
                          onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: e.target.value })}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => runWorkflow(w)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2"
                    >
                      <Play size={12} fill="currentColor" />
                      Execute Workflow
                    </button>
                    <div className="bg-black/40 border border-white/5 rounded-md p-2">
                      <div className="text-[10px] text-gray-500 font-mono mb-1">SCRIPT</div>
                      <pre className="text-[10px] text-gray-300 overflow-x-auto font-mono leading-relaxed">{w.script}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Area (Only visible on chat tab) */}
      {activeTab === "chat" && (
        <div className="shrink-0 p-4 bg-[#0a0a0a] border-t border-white/5">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-2 focus-within:border-brand-primary/40 focus-within:ring-1 focus-within:ring-brand-primary/40 transition shadow-lg flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              className="w-full max-h-40 min-h-[44px] bg-transparent text-sm text-zinc-100 px-3 pt-2 outline-none resize-none placeholder:text-zinc-500 leading-relaxed overflow-y-auto"
              placeholder={isAgentRunning ? "Agent is running..." : "Ask Jarvis to do something..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAgentRunning}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isAgentRunning && input.trim()) sendMessage();
                }
              }}
              rows={1}
            />
            <div className="flex items-center justify-between pt-2 px-1">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="bg-[#242424] hover:bg-[#2e2e2e] text-xs text-zinc-300 font-medium px-2 py-1 rounded-full border border-white/5 outline-none cursor-pointer transition appearance-none pr-1"
                    value={model}
                    disabled={isAgentRunning}
                    onChange={e => setModel(e.target.value)}
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="mistral-small-latest">Mistral Small</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-500">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                {tokenUsage && (
                  <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 shadow-sm shrink-0">
                    <span className="text-zinc-500">Token:</span>
                    <span className="text-zinc-200 font-semibold">{tokenUsage.total.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div>
                {isAgentRunning ? (
                  <button
                    onClick={stopAgent}
                    className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-full transition flex items-center justify-center shadow-md shadow-red-950/20"
                    title="Stop Execution"
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="p-2 bg-white hover:bg-zinc-200 text-black rounded-full disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-600 transition flex items-center justify-center shadow-md"
                  >
                    <Send size={14} fill="currentColor" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

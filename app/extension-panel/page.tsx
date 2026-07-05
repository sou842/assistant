"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Terminal, Settings, Play, Info, Square, Trash, History, Plus, X, MessageSquare } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toast } from "sonner";

export default function ExtensionPanel() {
  const [activeTab, setActiveTab] = useState<"chat" | "workflows">("chat");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("mistral-small-latest");
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Message Bridge Setup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "FROM_EXTENSION") {
        if (data.action === "UPDATE_STATE") {
          if (data.history) setChatHistory(data.history);
          if (data.savedChats) setSavedChats(data.savedChats);
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
      try {
        inputsObj = JSON.parse(rawInputs);
      } catch (e: any) {
        toast.error("Invalid JSON format in inputs: " + e.message);
        return;
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

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
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
            chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#1a1a1a] border border-white/5 text-gray-200 rounded-bl-sm prose prose-invert prose-sm prose-p:leading-snug prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-a:text-blue-400'}`}>
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.role === 'user' ? 'You' : 'Jarvis'}</span>
              </div>
            ))
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
                    <div>
                      <div className="text-[10px] text-gray-500 font-mono mb-1">INPUTS (JSON)</div>
                      <textarea
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs font-mono text-gray-300 resize-none h-16 outline-none focus:border-blue-500/50"
                        placeholder={'{"url": "https://..."}'}
                        value={workflowInputs[w._id] || ''}
                        onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: e.target.value })}
                      />
                    </div>
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
        <div className="shrink-0 p-3 bg-[#0a0a0a] border-t border-white/10">
          <div className="relative flex items-end bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500/50 transition">
            <textarea
              className="flex-1 max-h-32 min-h-[44px] bg-transparent text-sm text-gray-200 p-3 outline-none resize-none placeholder:text-gray-600"
              placeholder="Ask Jarvis to do something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
            />
            <div className="p-2 flex items-center gap-2 shrink-0">
              <select
                className="bg-transparent text-[10px] text-gray-500 outline-none cursor-pointer hover:text-gray-300 appearance-none pr-1"
                value={model}
                onChange={e => setModel(e.target.value)}
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="mistral-small-latest">Mistral Small</option>
              </select>
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-1.5 bg-white text-black rounded-lg disabled:opacity-50 disabled:bg-white/10 disabled:text-white transition"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

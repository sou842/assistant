"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { HistoryPanel } from "./components/HistoryPanel";
import { ChatTab } from "./components/ChatTab";
import { MentionsInput, MentionTag } from "./components/MentionsInput";
import { WorkflowsTab } from "./components/WorkflowsTab";
import { Send, Square, History, Plus, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExtensionPanel() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"chat" | "workflows">("chat");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (!data.success) throw new Error("Failed to load workflows");
    return data.data;
  });
  const { data: workflows = [] } = useSWR("/api/workflows", fetcher, { onError: () => toast.error("Failed to load workflows") });
  const [input, setInput] = useState("");
  const [model, setModel] = useState("mistral-small-latest");
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, any>>({});
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [mentionTags, setMentionTags] = useState<MentionTag[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const hasOpenedLogin = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocal(
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.search.includes("env=local")
      );
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" && !hasOpenedLogin.current) {
      hasOpenedLogin.current = true;
      window.parent.postMessage({ type: "FROM_NEXTJS", action: "OPEN_LOGIN_PAGE" }, "*");
    }
  }, [status]);

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
        } else if (data.action === "TRIGGER_RUN_WORKFLOW") {
          const w = workflows.find((wf: any) => wf._id === data.workflowId || wf.id === data.workflowId);
          if (w) {
            runWorkflow(w);
            toast.success("Agent started workflow execution");
          } else {
            toast.error("Agent attempted to run a workflow that was not found.");
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Request initial state on mount
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "REQUEST_INITIAL_STATE" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, [workflows, workflowInputs]);



  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const sendMessage = () => {
    if (!input.trim() && mentionTags.length === 0) return;

    const enrichedTags = mentionTags.map(tag => {
      if (tag.type === 'w') {
        const fullWorkflow = workflows.find((w: any) => w._id === tag.id || w.id === tag.id);
        if (fullWorkflow) {
          return { ...tag, workflowData: fullWorkflow };
        }
      }
      return tag;
    });

    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "RUN_AGENT",
      prompt: input,
      model: model,
      tags: enrichedTags
    }, "*");

    setInput("");
    setMentionTags([]);
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
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "STOP_AGENT"
    }, "*");
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#0a0a0a] text-zinc-400">
        <Loader2 className="animate-spin size-8 text-brand-primary mb-3" />
        <span className="text-xs font-medium tracking-wide">Checking session...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold tracking-tight text-sm text-gray-200">Jarvis Agent</h1>
            {isLocal && (
              <span className="bg-brand-primary/20 text-brand-primary text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider border border-brand-primary/30">Local</span>
            )}
          </div>
        </header>

        {/* Lock Screen UI */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-6">
            <Lock className="size-6 text-brand-primary" />
          </div>
          <h2 className="text-base font-semibold text-zinc-200 mb-2">Authentication Required</h2>
          <p className="text-xs text-zinc-500 max-w-[240px] leading-relaxed mb-6">
            Please log in to your account to securely chat with Jarvis and run automation workflows.
          </p>
          <button
            onClick={() => {
              window.parent.postMessage({ type: "FROM_NEXTJS", action: "OPEN_LOGIN_PAGE" }, "*");
            }}
            className="w-full max-w-[180px] bg-brand-primary text-black font-semibold text-xs py-2 px-4 rounded-full transition hover:opacity-90 active:scale-[0.98] cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

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
          {isLocal && (
            <span className="bg-brand-primary/20 text-brand-primary text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider border border-brand-primary/30">Local</span>
          )}
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
      <HistoryPanel
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        savedChats={savedChats}
      />

      {/* Tabs & Status Bar */}
      <div className="flex items-center justify-end p-2 gap-2 border-b border-white/10 shrink-0 bg-black/20">
        <div className="flex bg-white/5 p-0.5 rounded-full w-fit">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${activeTab === "chat" ? 'bg-blue-600/30 text-blue-300 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "workflows" ? 'bg-blue-600/30 text-blue-300 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Workflows
            {workflows.length > 0 && (
              <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px] leading-none text-gray-300">{workflows.length}</span>
            )}
          </button>
        </div>

        {/* <div className="flex items-center gap-3 pr-1">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              {isAgentRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isAgentRunning ? 'bg-blue-500' : 'bg-green-500'}`}></span>
            </span>
            <span className={isAgentRunning ? "text-blue-400" : "text-green-500/90"}>
              {isAgentRunning ? "Running" : "Ready"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-md border border-white/10" title={`Current Model: ${model}`}>
            <Brain size={12} className="text-gray-500" />
            <span className="truncate max-w-[60px] font-medium">{model.split('-')[0]}</span>
          </div>
        </div> */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">

        {/* Chat Tab */}
        <ChatTab
          activeTab={activeTab}
          chatHistory={chatHistory}
          isAgentRunning={isAgentRunning}
          editingIndex={editingIndex}
          setEditingIndex={setEditingIndex}
          editingText={editingText}
          setEditingText={setEditingText}
          handleSaveEdit={handleSaveEdit}
          handleCopy={handleCopy}
          handleDeleteMessage={handleDeleteMessage}
          chatEndRef={chatEndRef}
        />

        {/* Workflows Tab */}
        <WorkflowsTab
          activeTab={activeTab}
          workflows={workflows}
          expandedWorkflow={expandedWorkflow}
          setExpandedWorkflow={setExpandedWorkflow}
          workflowInputs={workflowInputs}
          setWorkflowInputs={setWorkflowInputs}
          runWorkflow={runWorkflow}
        />
      </div>

      {/* Input Area (Only visible on chat tab) */}
      {activeTab === "chat" && (
        <div className="shrink-0 p-4 bg-[#0a0a0a] border-t border-white/5">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-2 focus-within:border-brand-primary/40 focus-within:ring-1 focus-within:ring-brand-primary/40 transition shadow-lg flex flex-col gap-2">
            <MentionsInput
              value={input}
              onChange={(val) => setInput(val)}
              onEnter={() => {
                if (!isAgentRunning && input.trim()) sendMessage();
              }}
              disabled={isAgentRunning}
              placeholder={isAgentRunning ? "Agent is running..." : "Ask Jarvis to do something... (@w: for workflows)"}
              workflows={workflows}
              tags={mentionTags}
              onTagsChange={setMentionTags}
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
                    className="p-2 bg-brand-primary hover:bg-brand-primary/80 text-white rounded-full transition flex items-center justify-center shadow-md shadow-red-950/20 cursor-pointer"
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

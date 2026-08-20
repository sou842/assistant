"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { HistoryPanel } from "./components/HistoryPanel";
import { ChatTab } from "./components/ChatTab";
import { MentionsInput, MentionTag, MentionsInputRef } from "./components/MentionsInput";
import { WorkflowsTab } from "./components/WorkflowsTab";
import { SettingsTab } from "./components/SettingsTab";
import { Send, Square, History, Plus, Lock, Loader2, Workflow, AppWindow, Globe, FileText, SquareTerminal, Inbox, Settings, X, StickyNote, Target, MousePointerClick, Check, BrainCog, Mic, AudioLines } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ExtensionPanel() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"chat" | "workflows" | "inbox" | "settings">("chat");
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
  const [settings, setSettings] = useState({
    sandboxEnabled: true,
    maxActions: 75,
    desktopAlerts: true,
    soundAlerts: false,
    verboseLogs: false,
    stealthMode: false,
    autoSaveEnabled: false,
    autoSavePath: "/JarvisLogs",
    handsFreeMode: true,
  });

  const handleUpdateSettings = (updated: any) => {
    setSettings(updated);
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "SAVE_SETTINGS",
      settings: updated
    }, "*");
  };

  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, any>>({});
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [mentionTags, setMentionTags] = useState<MentionTag[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mentionsInputRef = useRef<MentionsInputRef>(null);

  const handleTriggerMention = (type: 'w' | 't' | 'p') => {
    mentionsInputRef.current?.triggerMention(type);
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [pendingNotes, setPendingNotes] = useState<string[]>([]);
  const [isFocusModeEnabled, setIsFocusModeEnabled] = useState(false);
  const [focusChain, setFocusChain] = useState<any[]>([]);
  const [focusChainIndex, setFocusChainIndex] = useState(0);
  const [agentError, setAgentError] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hasOpenedLogin = useRef(false);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      window.parent.postMessage({ type: "FROM_NEXTJS", action: "STOP_SPEECH_RECOGNITION" }, "*");
    } else {
      window.parent.postMessage({ type: "FROM_NEXTJS", action: "START_SPEECH_RECOGNITION" }, "*");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocal(
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.search.includes("env=local")
      );
      setIsFirefox(window.navigator.userAgent.includes("Firefox"));
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

  const toggleFocusMode = () => {
    const nextVal = !isFocusModeEnabled;
    setIsFocusModeEnabled(nextVal);
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "TOGGLE_FOCUS_MODE",
      enabled: nextVal
    }, "*");
    if (nextVal) {
      toast.success("Focus Mode enabled! Click on any element in the active browser tab to target it.");
    }
  };

  const clearFocusChain = () => {
    setFocusChain([]);
    setFocusChainIndex(0);
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "CLEAR_FOCUS_CHAIN"
    }, "*");
    toast.success("Focus steering chain cleared.");
  };

  const setFocusStep = (index: number) => {
    setFocusChainIndex(index);
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "SET_FOCUS_CHAIN_INDEX",
      index
    }, "*");
  };

  const removeFocusStep = (index: number) => {
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "REMOVE_FOCUS_STEP",
      index
    }, "*");
  };

  const prevIsRunningRef = useRef(isAgentRunning);
  useEffect(() => {
    if (settings.handsFreeMode && prevIsRunningRef.current === true && isAgentRunning === false) {
      window.parent.postMessage({ type: "FROM_NEXTJS", action: "START_SPEECH_RECOGNITION" }, "*");
    }
    prevIsRunningRef.current = isAgentRunning;
  }, [isAgentRunning, settings.handsFreeMode]);

  const handleDeleteMessage = (index: number) => {
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "DELETE_MESSAGE", index }, "*");
  };

  const handleRetryMessage = (index: number) => {
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "RETRY_MESSAGE", index }, "*");
  };

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return;
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "EDIT_MESSAGE", index, text: editingText }, "*");
    setEditingIndex(null);
    setEditingText("");
  };

  const runSandboxedWorkflow = async (script: string, inputs: any, messageId: string, isManual?: boolean) => {
    try {
      let runnerCode = script;
      if (/async\s+function\s+workflow\b/.test(script) || /function\s+workflow\b/.test(script)) {
        runnerCode += "\nreturn await workflow(browser, __inputs);";
      } else if (/async\s+function\s+main\b/.test(script) || /function\s+main\b/.test(script)) {
        runnerCode += "\nreturn await main(browser, __inputs);";
      }

      const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
      const runner = new AsyncFunction("browser", "__inputs", "runWorkflow", runnerCode);

      const callParent = async (command: string, args: any) => {
        return new Promise((resolve, reject) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve(event.data.result);
            } else {
              reject(new Error(event.data.error));
            }
          };
          window.parent.postMessage({ action: "command", command, args }, "*", [channel.port2]);
        });
      };

      const runWorkflow = async (workflowId: string, subInputs = {}) => {
        return await callParent("runSubWorkflow", { workflowId, subInputs });
      };

      const createLocatorProxy = (selector: string): any => ({
        first: () => createLocatorProxy(selector),
        waitFor: async (opts: any) => {
          return await callParent("waitFor", { selector, opts });
        },
        click: async () => {
          return await callParent("click", { selector });
        },
        type: async (val: string) => {
          return await callParent("type", { selector, val });
        },
        fill: async (val: string) => {
          return await callParent("fill", { selector, val });
        },
        getAttribute: async (attr: string) => {
          const res: any = await callParent("getAttribute", { selector, attr });
          return res?.result;
        },
        textContent: async () => {
          const res: any = await callParent("textContent", { selector });
          return res?.result;
        },
        inputValue: async () => {
          const res: any = await callParent("inputValue", { selector });
          return res?.result;
        }
      });

      const browserProxy = {
        getPage: async (urlPattern: string) => {
          const res: any = await callParent("getPage", { urlPattern });
          if (res && res.found) {
            return {
              locator: (selector: string) => createLocatorProxy(selector),
              close: async () => {
                return await callParent("closePage", {});
              },
              waitForTimeout: async (ms: number) => {
                return await callParent("waitForTimeout", { ms });
              },
              evaluate: async (fn: any, ...args: any[]) => {
                const fnStr = fn.toString();
                const res: any = await callParent("evaluate", { fnStr, args });
                return res?.result !== undefined ? res.result : res;
              },
              keyboard: {
                press: async (key: string) => {
                  return await callParent("keyboardPress", { key });
                }
              }
            };
          }
          return null;
        },
        newPage: async (url: string) => {
          await callParent("newPage", { url });
          return {
            locator: (selector: string) => createLocatorProxy(selector),
            close: async () => {
              return await callParent("closePage", {});
            },
            waitForTimeout: async (ms: number) => {
              return await callParent("waitForTimeout", { ms });
            },
            evaluate: async (fn: any, ...args: any[]) => {
              const fnStr = fn.toString();
              const res: any = await callParent("evaluate", { fnStr, args });
              return res?.result !== undefined ? res.result : res;
            },
            keyboard: {
              press: async (key: string) => {
                return await callParent("keyboardPress", { key });
              }
            }
          };
        }
      };

      const result = await runner(browserProxy, inputs, runWorkflow);
      window.parent.postMessage({ action: "result", success: true, result, messageId, isManual }, "*");
    } catch (err: any) {
      window.parent.postMessage({ action: "result", success: false, error: err.message, messageId, isManual }, "*");
    }
  };

  const playAudibleAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error("Audio error", e);
    }
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
          if (data.pendingNotes !== undefined) setPendingNotes(data.pendingNotes);
          if (data.isFocusModeEnabled !== undefined) setIsFocusModeEnabled(data.isFocusModeEnabled);
          if (data.focusChain !== undefined) setFocusChain(data.focusChain);
          if (data.focusChainIndex !== undefined) setFocusChainIndex(data.focusChainIndex);
          if (data.settings) setSettings(data.settings);
          if (data.agentError !== undefined) setAgentError(data.agentError);
        } else if (data.action === "WORKFLOW_RESULT") {
          if (data.success) {
            toast.success("Workflow completed successfully!");
          } else {
            toast.error("Workflow failed: " + data.error);
          }
        } else if (data.action === "TRIGGER_RUN_WORKFLOW") {
          const w = workflows.find((wf: any) => wf._id === data.workflowId || wf.id === data.workflowId);
          if (w) {
            runWorkflow(w, data.inputs);
            toast.success("Agent started workflow execution");
          } else {
            toast.error("Agent attempted to run a workflow that was not found.");
          }
        } else if (data.action === "execute") {
          runSandboxedWorkflow(data.script, data.inputs, data.messageId, data.isManual);
        } else if (data.action === "PLAY_SOUND") {
          playAudibleAlert();
        } else if (data.action === "NOTIFICATION_PERMISSION_DENIED") {
          toast.error("OS Notifications are blocked. Please enable Chrome notifications in your Mac/Windows System Settings.", { duration: 8000 });
        } else if (data.action === "SPEECH_STATUS") {
          setIsListening(data.isListening);
        } else if (data.action === "SPEECH_TRANSCRIPT") {
          const transcript = data.text;
          if (transcript) {
            setInput(transcript);
            if (isAgentRunning) {
              window.parent.postMessage({
                type: "FROM_NEXTJS",
                action: "ADD_RUNTIME_NOTE",
                text: transcript
              }, "*");
            } else {
              window.parent.postMessage({
                type: "FROM_NEXTJS",
                action: "RUN_AGENT",
                prompt: transcript,
                model: model,
                tags: []
              }, "*");
            }
            setTimeout(() => {
              setInput("");
            }, 600);
          }
        } else if (data.action === "SPEECH_ERROR") {
          setIsListening(false);
          if (data.error === "not-allowed") {
            toast.error("Microphone access denied. Opening permission request page...", { duration: 4000 });
            window.parent.postMessage({ type: "FROM_NEXTJS", action: "REQUEST_MIC_PERMISSION" }, "*");
          } else if (data.error === "firefox-unsupported") {
            toast.error("Voice input is not supported in Firefox extensions. Please use Chrome or Edge for voice commands.", { duration: 6000 });
          } else if (data.error === "network") {
            toast.error("Voice recognition requires internet access. Check your connection or try again.", { duration: 5000 });
          } else if (data.error === "unsupported") {
            toast.error("Your browser does not support voice input. Try Chrome or Edge.", { duration: 5000 });
          } else if (data.error === "no-speech") {
            toast.error("No speech detected. Try again and speak clearly.", { duration: 3000 });
          } else if (data.error === "audio-capture") {
            toast.error("Microphone not found or could not be accessed.", { duration: 4000 });
          } else {
            toast.error("Voice input failed. Please try again.", { duration: 3000 });
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Request initial state on mount
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "REQUEST_INITIAL_STATE" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, [workflows, workflowInputs, isAgentRunning, model]);

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

  const sendRuntimeNote = () => {
    if (!input.trim()) return;
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "ADD_RUNTIME_NOTE",
      text: input.trim()
    }, "*");
    setInput("");
  };

  const clearChat = () => {
    window.parent.postMessage({ type: "FROM_NEXTJS", action: "CLEAR_CHAT_HISTORY" }, "*");
  };

  const runWorkflow = (w: any, overrideInputs?: any) => {
    let inputsObj = {};
    if (overrideInputs) {
      inputsObj = overrideInputs;
    } else {
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
    }

    // Switch to chat tab to watch execution logs
    setActiveTab("chat");

    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "RUN_WORKFLOW",
      script: w.script,
      inputs: inputsObj,
      messageId: Date.now().toString(),
      isManual: true
    }, "*");
  };

  const stopAgent = () => {
    setIsAgentRunning(false);
    window.parent.postMessage({
      type: "FROM_NEXTJS",
      action: "STOP_AGENT"
    }, "*");
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-transparent text-app-text-muted">
        <Loader2 className="animate-spin size-8 text-brand-primary mb-3" />
        <span className="text-xs font-medium tracking-wide">Checking session...</span>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col h-screen w-full bg-app-canvas text-app-text-primary font-sans overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-3 border-b border-app-border-default/20 bg-app-surface/60 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold tracking-tight text-sm text-app-text-primary">Jarvis Agent</h1>
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
          <h2 className="text-base font-semibold text-app-text-primary mb-2">Authentication Required</h2>
          <p className="text-xs text-app-text-muted max-w-60 leading-relaxed mb-6">
            Please log in to your account to securely chat with Jarvis and run automation workflows.
          </p>
          <button
            onClick={() => {
              window.parent.postMessage({ type: "FROM_NEXTJS", action: "OPEN_LOGIN_PAGE" }, "*");
            }}
            className="w-full max-w-45 bg-brand-primary text-white font-semibold text-xs py-2 px-4 rounded-full transition hover:opacity-90 active:scale-[0.98] cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-app-canvas text-app-text-primary font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-app-border-default/20 bg-app-surface/60 backdrop-blur-md relative z-20">
        <button
          onClick={() => {
            window.parent.postMessage({ type: "FROM_NEXTJS", action: "NEW_CHAT" }, "*");
            setShowHistory(false);
            setActiveTab("chat");
          }}
          className="flex items-center gap-1 text-xs bg-app-surface-elevated hover:bg-app-surface-hover text-app-text-primary px-2.5 py-1 rounded-full border border-app-border-default/20 transition cursor-pointer"
        >
          <Plus size={14} /> New Chat
        </button>

        <div className="flex items-center gap-2">
          <h1 className="font-semibold tracking-tight text-sm text-app-text-primary">Jarvis Agent</h1>
          {isLocal && (
            <span className="bg-brand-primary/20 text-brand-primary text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider border border-brand-primary/30">Local</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-full transition cursor-pointer ${showHistory ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-app-surface-elevated text-app-text-muted'}`}
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
      {/* <div className="flex items-center justify-start p-2 gap-2 border-b border-white/10 shrink-0 bg-black/20"> */}
      {/* <div className="flex items-center gap-4 px-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`transition-colors cursor-pointer ${activeTab === "chat" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Chat"
          >
            <FileText size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`transition-colors cursor-pointer ${activeTab === "workflows" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Workflows"
          >
            <SquareTerminal size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`transition-colors cursor-pointer ${activeTab === "inbox" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Inbox"
          >
            <Inbox size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setActiveTab("browser")}
            className={`transition-colors cursor-pointer ${activeTab === "browser" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Browser"
          >
            <Chrome size={18} strokeWidth={1.5} />
          </button>
        </div> */}

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
      {/* </div> */}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">

        {/* Chat Tab */}
        <ChatTab
          activeTab={activeTab as any}
          chatHistory={chatHistory}
          isAgentRunning={isAgentRunning}
          editingIndex={editingIndex}
          setEditingIndex={setEditingIndex}
          editingText={editingText}
          setEditingText={setEditingText}
          handleSaveEdit={handleSaveEdit}
          handleCopy={handleCopy}
          handleDeleteMessage={handleDeleteMessage}
          handleRetryMessage={handleRetryMessage}
          chatEndRef={chatEndRef}
        />

        {/* Workflows Tab */}
        <WorkflowsTab
          activeTab={activeTab as any}
          workflows={workflows}
          expandedWorkflow={expandedWorkflow}
          setExpandedWorkflow={setExpandedWorkflow}
          workflowInputs={workflowInputs}
          setWorkflowInputs={setWorkflowInputs}
          runWorkflow={runWorkflow}
        />

        {/* Placeholder Tabs */}
        {activeTab === "inbox" && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Inbox size={48} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Inbox is empty</p>
          </div>
        )}

        {/* Settings Tab */}
        <SettingsTab
          activeTab={activeTab}
          session={session}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      {/* Input Area (Only visible on chat tab) */}

      <div className="flex flex-col gap-2 shrink-0 px-3 pb-2.5 pt-2 bg-[#0a0a0a] border-white/5">

        <div className="flex items-center gap-3 px-3">
          <button
            onClick={() => setActiveTab("chat")}
            className={`transition-colors cursor-pointer ${activeTab === "chat" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Chat"
          >
            <FileText size={16} strokeWidth={1} />
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`transition-colors cursor-pointer ${activeTab === "workflows" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Workflows"
          >
            <SquareTerminal size={16} strokeWidth={1} />
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`transition-colors cursor-pointer ${activeTab === "inbox" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Inbox"
          >
            <Inbox size={16} strokeWidth={1} />
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`transition-colors cursor-pointer ${activeTab === "settings" ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Settings"
          >
            <Settings size={16} strokeWidth={1} />
          </button>
        </div>
        <div className="bg-[#161616] border border-white/10 rounded-2xl p-2 focus-within:border-brand-primary/40 focus-within:ring-1 focus-within:ring-brand-primary/40 transition shadow-lg flex flex-col gap-2">
          {/* Focus Steering Chain */}
          {(focusChain.length > 0 || isFocusModeEnabled) && (
            <div className="px-3 py-2 bg-[#121212]/50 rounded-xl border-b border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-normal tracking-wider font-mono flex items-center gap-1.5">
                  <MousePointerClick size={14} className="text-zinc-400" />
                  Focus Points
                </span>
                <button
                  type="button"
                  onClick={clearFocusChain}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {focusChain.length > 0 && (
                <div className="relative pl-2.5 flex flex-col gap-4 max-h-40 overflow-y-auto pr-1 py-1">
                  {/* Vertical Connector Line */}
                  <div className="absolute left-4.25 top-2 bottom-2 w-px bg-zinc-800 pointer-events-none" />

                  {focusChain?.map((step, idx) => {
                    const isCompleted = idx < focusChainIndex;
                    const isActive = idx === focusChainIndex;
                    return (
                      <div
                        key={idx}
                        className="relative flex gap-3 items-start group/step"
                      >
                        {/* Bullet / Step Indicator */}
                        <button
                          type="button"
                          onClick={() => setFocusStep(idx)}
                          className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-1 transition-all cursor-pointer border text-[8px] font-bold ${isCompleted
                              ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-blue-500/30'
                              : isActive
                                ? 'bg-[#121212] border-blue-100 text-brand-primary'
                                : 'bg-[#161616] border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'
                            }`}
                          title={`Jump to Step ${idx + 1}`}
                        >
                          {isCompleted ? (
                            <Check size={8} strokeWidth={3} />
                          ) : isActive ? (
                            <span className="w-1 h-1 rounded-full bg-blue-100" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </button>

                        {/* Step Details */}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setFocusStep(idx)}
                            className="flex-1 text-left cursor-pointer min-w-0"
                          >
                            <p className={`text-[11px] font-medium font-sans truncate transition-colors mt-0.5 ${isActive
                                ? 'text-app-primary font-normal'
                                : isCompleted
                                  ? 'text-zinc-500'
                                  : 'text-zinc-400 hover:text-zinc-300'
                              }`}>
                              Step {idx + 1}: {step.description}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFocusStep(idx)}
                            className="opacity-0 group-hover/step:opacity-100 p-1 rounded-full hover:bg-red-400/10 text-zinc-500 hover:text-red-400 transition-opacity cursor-pointer shrink-0"
                            title="Remove Step"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {pendingNotes?.length > 0 && (
            <div className="flex flex-col gap-2.5 px-3 py-1 bg-[#121212]/30 rounded-t-2xl border-b border-white/5">
              <div className="space-y-3 pl-2.5 ml-2 my-1">
                {pendingNotes?.map((note, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-center group/note -ml-4"
                  >
                    <StickyNote size={12} className="text-zinc-500 group-hover/note:text-blue-400 transition-colors shrink-0" />
                    <span className="text-xs text-zinc-300 transition-colors font-sans flex-1 truncate">{note || ''}</span>
                    <button
                      type="button"
                      onClick={() => {
                        window.parent.postMessage({ type: "FROM_NEXTJS", action: "REMOVE_RUNTIME_NOTE", index }, "*");
                      }}
                      className="p-1 rounded-full hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 mr-1"
                      title="Remove Note"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <MentionsInput
            ref={mentionsInputRef}
            value={input}
            onChange={(val) => setInput(val)}
            onEnter={() => {
              if (input.trim()) {
                if (isAgentRunning) {
                  sendRuntimeNote();
                } else {
                  sendMessage();
                }
              }
            }}
            disabled={false}
            placeholder={isAgentRunning ? "Send a note/guidance to the running agent..." : "Ask Jarvis to do something... (@w: for workflows)"}
            workflows={workflows}
            tags={mentionTags}
            onTagsChange={setMentionTags}
            pendingNotes={pendingNotes}
          />
          <div className="flex items-center justify-between pt-2 px-1">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isAgentRunning}
                    className="bg-white/5 hover:bg-white/10 p-1 text-zinc-400 hover:text-zinc-200 rounded-full transition-colors flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Insert reference"
                  >
                    <Plus size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#161616] border border-white/10 text-zinc-300 min-w-[180px] rounded-lg">
                  <DropdownMenuItem
                    onClick={() => handleTriggerMention('w')}
                    className="hover:bg-white/5 cursor-pointer focus:bg-white/5 focus:text-zinc-100 flex items-center gap-2 rounded-full text-[11px] py-1.5"
                  >
                    <Workflow size={12} className="text-zinc-400" />
                    <span>Workflow</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleTriggerMention('t')}
                    className="hover:bg-white/5 cursor-pointer focus:bg-white/5 focus:text-zinc-100 flex items-center gap-2 rounded-full text-[11px] py-1.5"
                  >
                    <AppWindow size={12} className="text-zinc-400" />
                    <span>Tabs</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleTriggerMention('p')}
                    className="hover:bg-white/5 cursor-pointer focus:bg-white/5 focus:text-zinc-100 flex items-center gap-2 rounded-full text-[11px] py-1.5"
                  >
                    <Globe size={12} className="text-zinc-400" />
                    <span>Pages</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={toggleFocusMode}
                className={`p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer ${isFocusModeEnabled
                  ? 'bg-brand-primary text-white animate-pulse'
                  : 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                title="Toggle Element Focus Selection Mode"
              >
                <MousePointerClick size={16} />
              </button>
              {/* <div className="relative">
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
                </div> */}

              {tokenUsage && (
                <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 shadow-sm shrink-0">
                  <span className="text-zinc-500">Token:</span>
                  <span className="text-zinc-200 font-semibold">{tokenUsage.total.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isFirefox && settings.audioEnabled !== false && (
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer ${isListening
                    ? "bg-brand-primary/20 text-brand-primary animate-pulse border border-brand-primary/30"
                    : "hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  title={isListening ? "Stop listening" : "Voice typing / Voice command"}
                >
                  {isListening ? <AudioLines size={14} /> : <Mic size={14} />}
                </button>
              )}

              {isAgentRunning ? (
                <>
                  <button
                    onClick={stopAgent}
                    className="p-2 bg-brand-primary hover:bg-brand-primary/80 text-white rounded-full transition flex items-center justify-center shadow-md shadow-red-950/20 cursor-pointer"
                    title="Stop Execution"
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                  <button
                    onClick={isAgentRunning ? sendRuntimeNote : sendMessage}
                    disabled={!input.trim()}
                    className={`p-2 bg-white hover:bg-zinc-200 text-black rounded-full disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-600 transition flex items-center justify-center shadow-md cursor-pointer ${!input.trim() ? "hidden" : ""}`}
                    title={isAgentRunning ? "Send Note to Agent" : "Send message"}
                  >
                    <Send size={14} fill="currentColor" />
                  </button>
                </>
              ) :
                <button
                  onClick={isAgentRunning ? sendRuntimeNote : sendMessage}
                  disabled={!input.trim()}
                  className="p-2 bg-white hover:bg-zinc-200 text-black rounded-full disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-600 transition flex items-center justify-center shadow-md cursor-pointer"
                  title={isAgentRunning ? "Send Note to Agent" : "Send message"}
                >
                  <Send size={14} fill="currentColor" />
                </button>
              }
            </div>
          </div>
        </div>
        {/* )} */}
      </div>
      {agentError && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200 cursor-default"
          onClick={() => {
            setAgentError(null);
            window.parent.postMessage({ type: "FROM_NEXTJS", action: "CLEAR_AGENT_ERROR" }, "*");
          }}
        >
          <div
            className="bg-[#121212] border border-white/10 rounded-2xl p-5 max-w-xs w-full mx-4 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 cursor-default flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon with red glowing background */}
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-1 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
              <BrainCog size={20} />
            </div>

            <div className="space-y-1.5 w-full">
              <h3 className="font-semibold text-sm text-white font-sans">{agentError.title || "Authentication Error"}</h3>
              {agentError.modelName && (
                <div className="text-[10px] text-zinc-400 font-mono py-0.5 px-2 rounded w-fit mx-auto">
                  {agentError.modelName}
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans max-h-32 overflow-y-auto w-full px-2.5 py-2 bg-black/20 rounded-xl border border-white/5">
              {agentError.message || "Failed to authenticate with AI provider. Please verify your API Key/Token."}
            </p>

            <div className="flex gap-2.5 w-full pt-1.5">
              <button
                onClick={() => {
                  setAgentError(null);
                  window.parent.postMessage({ type: "FROM_NEXTJS", action: "CLEAR_AGENT_ERROR" }, "*");
                }}
                className="flex-1 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer font-sans"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setAgentError(null);
                  window.parent.postMessage({ type: "FROM_NEXTJS", action: "CLEAR_AGENT_ERROR" }, "*");
                  setActiveTab("settings");
                }}
                className="flex-1 py-2 rounded-full text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary/80 transition cursor-pointer font-sans"
              >
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

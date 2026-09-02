"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Save, FileBadge, AlertCircle, Bot, Code2, Eye, Database } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "../../_components/page-header";
import { SandboxEditor } from "../_components/sandbox-editor";
import { Button } from "@/components/ui/button";

import { useAI } from "../../_components/ai-provider";
import { useChat } from "@ai-sdk/react";
import { VaultChatSidePanel } from "../../vault/_components/vault-chat-side-panel";
import { motion, AnimatePresence } from "motion/react";
import { AgentWorkAura } from "../_components/agent-work-aura";
import { saveLocalChat, loadLocalChat, deleteLocalChat } from "@/lib/local-chat-storage";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export default function StudioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/studio/${id}` : null,
    fetcher
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"code" | "preview" | "database">("preview");

  // History State
  const [history, setHistory] = useState<{ title: string; content: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  const indexRef = useRef(historyIndex);

  useEffect(() => {
    historyRef.current = history;
    indexRef.current = historyIndex;
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTitle(history[newIndex].title);
      setContent(history[newIndex].content);
      setIsEditing(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTitle(history[newIndex].title);
      setContent(history[newIndex].content);
      setIsEditing(true);
    }
  };

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [input, setInput] = useState("");
  const [selectedContext, setSelectedContext] = useState<{ text: string, html: string } | null>(null);
  const [chatLoaded, setChatLoaded] = useState(false);

  const { memories, selectedModel, setSelectedModel } = useAI();

  const chat = useChat({
    id: `studio-item-${id}`,
    initialMessages: [],
    onFinish: ({ message }) => {
      mutate();
    },
    onError: (err) => {
      console.error("Chat error:", err);
      toast.error("Chat request failed");
    },
  });

  const { messages, status, regenerate } = chat;
  const sendMessage = (chat as any).sendMessage || (chat as any).append;
  const isChatLoading = status === "submitted" || status === "streaming";

  const getSystemPrompt = () => {
    const currentTitle = title || data?.item?.title || "Untitled Document";
    const currentContent = content || data?.item?.content || "";

    const itemContext = (data?.item || currentContent) ? `
CURRENT WORKSPACE CONTEXT:
ID: ${id}
Title: ${currentTitle}
Tags: ${data?.item?.tags?.join(", ") || "None"}
Workspace Files (JSON Format):
${currentContent}
` : "";

    return `You are Jarvis, an expert full-stack React developer assistant integrated into a VS Code-style Multi-File React Sandbox workspace.
The user is working on the workspace files provided in the CURRENT WORKSPACE CONTEXT below.

CRITICAL PRINCIPLES - APP COMPREHENSION & DEDICATED IN-PLACE EDITING:
1. DEEP COMPREHENSION FIRST:
   - Thoroughly inspect all files in the CURRENT WORKSPACE CONTEXT before making changes.
   - Understand the existing component hierarchy, state variables, UI layout, routes/tabs, and dependencies.
   - Understand the user's exact request carefully. Do NOT do random or unrelated things. Focus precisely on what the user asked for.

2. SURGICAL & NON-DESTRUCTIVE EDITS:
   - ALWAYS preserve existing working features, styling, state, and components unless the user explicitly asks to remove or change them.
   - Do NOT wipe out or replace full apps with basic placeholder stubs.
   - When modifying a file, ensure all necessary imports (e.g., Lucide icons, React hooks, UI components) are present and valid.

3. DEDICATED WORKSPACE LOCK (ID: "${id}"):
   - You are working exclusively inside the active Studio Document with ID "${id}".
   - Apply edits DIRECTLY to THIS document using 'updateStudioFile', 'updateStudioDocument', or 'editStudioDocumentSection' with id: "${id}".
   - NEVER call 'createStudioDocument'. The user is already in their active workspace and expects in-place updates.
   - To update or add an individual file (e.g. 'app.tsx' or 'components/Header.tsx'), call 'updateStudioFile("${id}", filePath, fileContent)'.
   - To replace the full file tree, call 'updateStudioDocument("${id}", { content: stringifiedJsonFileMap })'.
   - To perform a fast substring replacement, call 'editStudioDocumentSection("${id}", targetText, newText)'.
   - Always ensure 'app.tsx' exists and exports a default React component ('export default function App() { ... }').

4. REPORT LATEST DETAILS AFTER EDITING:
   - After invoking the tool to apply the change, clearly summarize the latest state of the app for the user:
     * Specify which files were updated or created.
     * Describe the exact features, components, or UI adjustments that were made.
     * Explain how the user can interact with or test the newly added features.

WORKFLOW & AUTOMATION INTEGRATION:
- Workflows are powerful multi-step automation pipelines (HTTP requests, AI prompts, weather checks, browser scraping, WhatsApp/Gmail dispatch) that can run directly inside React apps.
- Discovery: Call the 'listWorkflows' tool to find available workflows, their exact IDs, titles, descriptions, and required input parameter keys.
- Hook Import:
  \`\`\`tsx
  import { useWorkflow } from '@studio/workflow'; // also available as '@/workflow' or 'workflow'
  \`\`\`
- Complete Usage Pattern:
  \`\`\`tsx
  import React, { useState } from 'react';
  import { useWorkflow } from '@studio/workflow';
  import { Play, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

  export default function AutomationPanel() {
    const [topic, setTopic] = useState('');
    
    // 1. Initialize hook with workflow title or MongoDB ID
    const { execute, run, loading, data, error, reset } = useWorkflow("workflow-title-or-id");

    const handleRun = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic.trim()) return;
      
      // 2. Pass input object matching expected workflow parameters
      await execute({ query: topic, input: topic });
    };

    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <form onSubmit={handleRun} className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter workflow parameter..."
            className="flex-1 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Running...' : 'Execute'}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5 text-green-400"><CheckCircle size={14} /> Result Ready</span>
              <button onClick={reset} className="hover:text-zinc-200 transition cursor-pointer flex items-center gap-1">
                <RefreshCw size={12} /> Reset
              </button>
            </div>
            <pre className="text-xs text-zinc-300 overflow-x-auto p-2 bg-zinc-900/60 rounded-lg">
              {typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}
            </pre>
          </div>
        )}
      </div>
    );
  }
  \`\`\`
- Best Practices for Workflow UIs:
  * Render loading spinners or skeleton loaders while \`loading\` is true.
  * Allow retrying/resetting workflow state via \`reset()\`.
  * Format workflow response objects neatly into visual cards, data tables, or charts rather than raw unformatted strings.

PERSISTENT KEY-VALUE DATABASE:
- Access persistent client storage via \`window.studioDb\`:
  - \`await window.studioDb.get(key)\`
  - \`await window.studioDb.set(key, value)\`
  - \`await window.studioDb.getAll()\`
  - \`await window.studioDb.remove(key)\`

PREMIUM DESIGN & STYLING GUIDELINES:
- Use Tailwind CSS utility classes inside your JSX elements exclusively. Do NOT use inline <style> tags.
- Use polished dark themes (\`bg-zinc-950\`, \`bg-zinc-900/50\`, \`border-zinc-800/80\`), glowing gradients (\`bg-gradient-to-r from-indigo-500 to-purple-600\`), glassmorphism (\`backdrop-blur-xl\`), and smooth interactive hover effects.
- Use 'lucide-react' for all icons (e.g., \`import { Sparkles, Activity, Play, CheckCircle, Database, Search, RefreshCw, AlertCircle, Copy } from "lucide-react";\`).
- Ensure all interactive elements feel alive, modern, responsive, and state of the art.

${itemContext}`;
  };

  const sendMessageWithContext = async (payload: any, options?: any) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    await sendMessage(payload, {
      ...options,
      body: {
        ...options?.body,
        skipSave: true,
        memories: enabledMemories,
        systemPrompt: getSystemPrompt(),
      },
    });
  };

  const regenerateWithContext = (options?: any) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    regenerate({
      ...options,
      body: {
        ...options?.body,
        skipSave: true,
        memories: enabledMemories,
        systemPrompt: getSystemPrompt(),
      },
    });
  };

  const handleClearChat = async () => {
    chat.setMessages([]);
    await deleteLocalChat(`studio-chat-${id}`);
  };

  useEffect(() => {
    loadLocalChat(`studio-chat-${id}`).then((msgs) => {
      if (msgs.length > 0) {
        chat.setMessages(msgs);
      }
      setChatLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    if (chatLoaded) {
      if (messages.length > 0) {
        saveLocalChat(`studio-chat-${id}`, messages);
      } else {
        deleteLocalChat(`studio-chat-${id}`);
      }
    }
  }, [messages, chatLoaded, id]);

  useEffect(() => {
    if (data?.item) {
      const newTitle = data.item.title;
      const newContent = data.item.content || "";

      if (historyRef.current.length === 0) {
        setTitle(newTitle);
        setContent(newContent);
        setHistory([{ title: newTitle, content: newContent }]);
        setHistoryIndex(0);
        return;
      }

      const currentEntry = historyRef.current[indexRef.current];
      if (!currentEntry || currentEntry.title !== newTitle || currentEntry.content !== newContent) {
        setTitle(newTitle);
        setContent(newContent);
        
        const newHistory = historyRef.current.slice(0, indexRef.current + 1);
        newHistory.push({ title: newTitle, content: newContent });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  }, [data?.item]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/studio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        toast.success("Document saved");
        mutate();
        setIsEditing(false);
      } else {
        toast.error("Failed to save document");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('document-page');

      if (!element) {
        toast.error("Could not find document element");
        return;
      }

      toast.info("Generating PDF...");

      const opt = {
        margin: 10,
        filename: `${title || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("PDF Downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-app-surface">
        <div className="flex flex-col items-center text-center max-w-lg p-8">
          <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-app-danger-strong">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-medium text-app-text-primary mb-2">Failed to load document</h3>
          <p className="text-sm text-app-text-secondary mb-6">
            We couldn't retrieve this document. It might have been deleted or you may not have permission.
          </p>
          <Link
            href="/ai/studio"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-app-surface-glass-strong text-sm font-medium text-app-text-primary hover:bg-app-surface-hover transition-colors"
          >
            Back to Studio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-app-surface relative">
      <div className="flex h-full flex-1 flex-col min-w-0 relative z-10">
        <PageHeader
          backHref="/ai/studio"
          icon={<FileBadge className="text-brand-primary" />}
          title={
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full max-w-md bg-transparent px-2.5 py-1 text-base font-semibold text-app-text-primary outline-none rounded-full transition-all duration-200 ${
                isEditing
                  ? "bg-app-surface-glass-soft focus:border-brand-primary/55 focus:ring-1 focus:ring-brand-primary/10"
                  : "cursor-default"
              }`}
              placeholder="Enter document title..."
              readOnly={!isEditing}
            />
          }
          className="hidden md:sticky sm:block"
          actions={
            <div className="flex items-center gap-2">
              {/* <Button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 rounded-full text-app-text-secondary hover:text-app-text-primary disabled:opacity-30 disabled:hover:text-app-text-secondary"
                title="Undo"
              >
                <Undo2 size={16} />
              </Button>
              <Button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 rounded-full text-app-text-secondary hover:text-app-text-primary disabled:opacity-30 disabled:hover:text-app-text-secondary"
                title="Redo"
              >
                <Redo2 size={16} />
              </Button>
              
              <div className="w-px h-4 bg-app-border-default mx-1" /> */}

              <div className="flex items-center gap-1.5 bg-app-surface-glass-strong border border-app-border-default/40 rounded-full py-0.5 px-1 shadow-sm">
                {(["code", "preview", "database"] as const).map((mode) => {
                  const Icon = mode === "code" ? Code2 : mode === "preview" ? Eye : Database;
                  return (
                    <button
                      key={mode}
                      onClick={() => setLayoutMode(mode)}
                      className={`p-1.5 rounded-full transition-all cursor-pointer ${
                        layoutMode === mode
                          ? "bg-app-primary/20 text-white shadow-md"
                          : "text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass"
                      }`}
                      title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-4 bg-app-border-default mx-1" />

              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="rounded-full h-8 px-4 text-xs font-medium bg-app-surface-glass-strong text-app-text-primary hover:bg-app-surface-glass"
                >
                  Edit
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="rounded-full h-8 px-4 text-xs font-medium bg-brand-primary text-white hover:bg-brand-primary/90"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {/* Save */}
                </Button>
              )}
            </div>
          }
        />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 relative overflow-y-auto bg-app-canvas">
            <div className="absolute inset-0 app-grid-overlay opacity-25 pointer-events-none" />
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-app-text-muted animate-spin" />
              </div>
            ) : (
              <>
                <SandboxEditor
                  id={id}
                  key={id}
                  initialData={content || data?.item?.content || ""}
                  onChange={(json) => setContent(json)}
                  readOnly={!isEditing}
                  layoutMode={layoutMode}
                  setLayoutMode={setLayoutMode}
                />

                <AgentWorkAura isWorking={isChatLoading} />
              </>
            )}
          </div>
        </div>
      </div>

      <Button
        variant={showChat ? "default" : "ghost"}
        onClick={() => setShowChat(!showChat)}
        size="sm"
        className={`hidden fixed right-6 bottom-6 z-50 group md:flex size-14 cursor-pointer items-center justify-center rounded-full bg-app-primary text-app-primary-foreground shadow-2xl transition-all hover:scale-110 hover:bg-app-primary-hover active:scale-95 ${showChat ? "bg-app-primary text-white hover:bg-brand-primary/90 hidden" : "text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong"
          }`}
        title={showChat ? "Close AI Assistant" : "Open AI Assistant"}
      >
        <Bot size={24} className="group-hover:rotate-90 transition-transform duration-300 group-hover:text-app-primary text-app-primary-foreground" />
      </Button>

      <AnimatePresence mode="wait">
        {showChat && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-40 h-full w-[400px] shrink-0 border-l border-app-border-subtle shadow-2xl"
            style={{ border: '1px' }}
          >
            <VaultChatSidePanel
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isChatLoading}
              sendMessage={sendMessageWithContext}
              regenerate={regenerateWithContext}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onClose={() => setShowChat(false)}
              onClearChat={handleClearChat}
              itemTitle={title || "Untitled Document"}
              itemType={data?.item?.type}
              selectedContext={selectedContext}
              setMessages={chat.setMessages}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

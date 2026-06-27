"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Loader2, Save, Download, FileBadge, AlertCircle, Bot, Undo2, Redo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "../../_components/page-header";
import { DocumentEditor } from "../_components/document-editor";
import { Button } from "@/components/ui/button";

import { useAI } from "../../_components/ai-provider";
import { useChat } from "@ai-sdk/react";
import { VaultChatSidePanel } from "../../vault/_components/vault-chat-side-panel";
import { motion, AnimatePresence } from "motion/react";
import { AgentWorkAura } from "../_components/agent-work-aura";

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
  const [isEditing, setIsEditing] = useState(false);

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
  const [showChat, setShowChat] = useState(true);
  const [input, setInput] = useState("");
  const [selectedContext, setSelectedContext] = useState<{ text: string, html: string } | null>(null);

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

  const sendMessageWithContext = async (payload: any, options?: any) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    const itemContext = data?.item ? `
CURRENT ITEM CONTEXT:
ID: ${id}
Type: ${data.item.type}
Title: ${title}
Tags: ${data.item.tags?.join(", ") || "None"}
Content: ${JSON.stringify(content, null, 2)}
${selectedContext ? `\nUSER'S CURRENT ACTIVE SELECTION:\nText: "${selectedContext.text}"\nHTML Context: \`${selectedContext.html}\`\n(If the user says "this", "the selection", or "here", they mean this specific highlighted HTML section. ALWAYS target your updates towards this selected HTML section if asked to modify it.)` : ""}
` : "";

    await sendMessage(payload, {
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, an AI assistant integrated into a Studio Document viewer. 
The user is currently viewing and working on the document provided in the CURRENT ITEM CONTEXT below.

CRITICAL INSTRUCTION: If the user asks to "generate", "create", "write", "update", "format", or "edit" ANY document, resume, slide, or content, they are ALWAYS referring to THIS specific item they are currently viewing.
DO NOT use 'createStudioDocument'. You MUST use 'updateStudioDocument' with the provided ID to overwrite/update the current document, unless they explicitly say "create a NEW file".

TAILWIND CSS STYLING & DESIGN SKILLS (MULTIPLE DESIGN SYSTEMS):
- You have full access to Tailwind CSS. ALWAYS style your generated HTML using modern Tailwind CSS classes in the "class" attribute.
- DO NOT write long inline "style" attributes unless absolutely necessary.
- ALWAYS wrap your entire document in a styled outer container. DO NOT just output loose headers and paragraphs on a plain page.
- Choose the design system that best fits the context (or ask the user what aesthetic they prefer if ambiguous):
  * OPTION 1 (Paper Design System): Best for print-inspired, minimalist, clean, tactile documents/resumes/reports.
    - Visual Style: Minimal, clean, paper-textured, print-inspired aesthetic with tactile qualities.
    - Color Palette: Primary=#111111, Secondary=#8B5CF6, Success=#16A34A, Warning=#D97706, Danger=#DC2626, Surface=#FFFFFF, Text=#111827.
    - Typography: Headers (H1/H2/H3) = Montserrat (strong weights), Body Text = Roboto, Mono/Labels = PT Mono.
    - Spacing Scale: 4px/8px/12px/16px/24px/32px spacing intervals (Tailwind p-1, p-2, p-3, p-4, p-6, p-8).
    - Page wrapper: \`bg-white shadow-xl max-w-4xl mx-auto rounded-xl p-8 md:p-12 border border-slate-200/50 mt-4 mb-4\`.
  * OPTION 2 (Premium Design System): Best for modern, polished, Apple-inspired dashboards, landing pages, tech portfolios, and SaaS designs.
    - Visual Style: Modern, premium, polished visual language.
    - Color Palette: Primary=#3B82F6, Secondary=#8B5CF6, Success=#16A34A, Warning=#D97706, Danger=#DC2626, Surface=#FFFFFF, Text=#111827.
    - Typography: Headers (H1/H2/H3) = Inter, Body Text = Inter, Mono/Labels = JetBrains Mono.
    - Spacing Scale: 4px/8px/12px/16px/24px/32px spacing intervals (Tailwind p-1, p-2, p-3, p-4, p-6, p-8).
    - Page wrapper: \`bg-slate-50 border border-slate-100 max-w-4xl mx-auto rounded-2xl p-8 md:p-16 shadow-2xl mt-4 mb-4\`.
  * Accessibility: WCAG 2.2 AA compliant contrast, high readability, no low-contrast text.
  
INTERACTIVE WEB APPS (HTML, CSS, JS):
- You can create fully functional, interactive web pages and mini-apps (like calculators, tools, games, dynamic forms).
- If the user requests interactive functionality, ALWAYS include Vanilla JavaScript within <script> tags at the end of the document.
- Your generated JavaScript will be executed! Use document.querySelector or getElementById to hook into your rendered HTML elements.
- Ensure the app logic is fully working and robust.

PLANNING & DESIGN PROTOCOL:
Before calling the 'updateStudioDocument' tool, you MUST explicitly write down your design plan in your thoughts or conversational response:
1. Choose Design System: Select either Paper Design System or Premium Design System based on context, or ask the user.
2. Define Colors: Select and verify the exact HEX color tokens to use.
3. Define Typography: Outline heading and body font weight/size hierarchies.
4. Define Spacing Rules: Set up structural padding/margin rhythm matching the 4px-32px scale.
5. Define Component Styles: Detail borders, shadows, rounded corners, and badge accents.
6. Define Page Layout: Architect the responsive sheet wrapper layout.
Once this design plan is documented in your text, proceed to execute the tool call.

${itemContext}`,
      },
    });
  };

  const regenerateWithContext = (options?: any) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    const itemContext = data?.item ? `
CURRENT ITEM CONTEXT:
ID: ${id}
Type: ${data.item.type}
Title: ${title}
Tags: ${data.item.tags?.join(", ") || "None"}
Content: ${JSON.stringify(content, null, 2)}
` : "";

    regenerate({
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, an AI assistant integrated into a Studio Document viewer. 
The user is currently viewing and working on the document provided in the CURRENT ITEM CONTEXT below.

CRITICAL INSTRUCTION: If the user asks to "generate", "create", "write", "update", "format", or "edit" ANY document, resume, slide, or content, they are ALWAYS referring to THIS specific item they are currently viewing.
DO NOT use 'createStudioDocument'. You MUST use 'updateStudioDocument' with the provided ID to overwrite/update the current document, unless they explicitly say "create a NEW file".

TAILWIND CSS STYLING & DESIGN SKILLS (MULTIPLE DESIGN SYSTEMS):
- You have full access to Tailwind CSS. ALWAYS style your generated HTML using modern Tailwind CSS classes in the "class" attribute.
- DO NOT write long inline "style" attributes unless absolutely necessary.
- ALWAYS wrap your entire document in a styled outer container. DO NOT just output loose headers and paragraphs on a plain page.
- Choose the design system that best fits the context (or ask the user what aesthetic they prefer if ambiguous):
  * OPTION 1 (Paper Design System): Best for print-inspired, minimalist, clean, tactile documents/resumes/reports.
    - Visual Style: Minimal, clean, paper-textured, print-inspired aesthetic with tactile qualities.
    - Color Palette: Primary=#111111, Secondary=#8B5CF6, Success=#16A34A, Warning=#D97706, Danger=#DC2626, Surface=#FFFFFF, Text=#111827.
    - Typography: Headers (H1/H2/H3) = Montserrat (strong weights), Body Text = Roboto, Mono/Labels = PT Mono.
    - Spacing Scale: 4px/8px/12px/16px/24px/32px spacing intervals (Tailwind p-1, p-2, p-3, p-4, p-6, p-8).
    - Page wrapper: \`bg-white shadow-xl max-w-4xl mx-auto rounded-xl p-8 md:p-12 border border-slate-200/50 mt-4 mb-4\`.
  * OPTION 2 (Premium Design System): Best for modern, polished, Apple-inspired dashboards, landing pages, tech portfolios, and SaaS designs.
    - Visual Style: Modern, premium, polished visual language.
    - Color Palette: Primary=#3B82F6, Secondary=#8B5CF6, Success=#16A34A, Warning=#D97706, Danger=#DC2626, Surface=#FFFFFF, Text=#111827.
    - Typography: Headers (H1/H2/H3) = Inter, Body Text = Inter, Mono/Labels = JetBrains Mono.
    - Spacing Scale: 4px/8px/12px/16px/24px/32px spacing intervals (Tailwind p-1, p-2, p-3, p-4, p-6, p-8).
    - Page wrapper: \`bg-slate-50 border border-slate-100 max-w-4xl mx-auto rounded-2xl p-8 md:p-16 shadow-2xl mt-4 mb-4\`.
  * Accessibility: WCAG 2.2 AA compliant contrast, high readability, no low-contrast text.

INTERACTIVE WEB APPS (HTML, CSS, JS):
- You can create fully functional, interactive web pages and mini-apps (like calculators, tools, games, dynamic forms).
- If the user requests interactive functionality, ALWAYS include Vanilla JavaScript within <script> tags at the end of the document.
- Your generated JavaScript will be executed! Use document.querySelector or getElementById to hook into your rendered HTML elements.
- Ensure the app logic is fully working and robust.

PLANNING & DESIGN PROTOCOL:
Before calling the 'updateStudioDocument' tool, you MUST explicitly write down your design plan in your thoughts or conversational response:
1. Choose Design System: Select either Paper Design System or Premium Design System based on context, or ask the user.
2. Define Colors: Select and verify the exact HEX color tokens to use.
3. Define Typography: Outline heading and body font weight/size hierarchies.
4. Define Spacing Rules: Set up structural padding/margin rhythm matching the 4px-32px scale.
5. Define Component Styles: Detail borders, shadows, rounded corners, and badge accents.
6. Define Page Layout: Architect the responsive sheet wrapper layout.
Once this design plan is documented in your text, proceed to execute the tool call.

${itemContext}`,
      },
    });
  };

  const handleClearChat = () => {
    chat.setMessages([]);
  };

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
          icon={<FileBadge />}
          title={
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full max-w-md border-none bg-transparent px-0 text-base font-medium text-app-text-primary outline-none placeholder:text-app-text-ghost"
              placeholder="Enter document title..."
              readOnly={!isEditing}
            />
          }
          subtitle="Professional Document"
          actions={
            <div className="flex items-center gap-2">
              <Button
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
              
              <div className="w-px h-4 bg-app-border-default mx-1" />

              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="rounded-full h-9 px-4 text-xs font-medium bg-app-surface-glass-strong text-app-text-primary hover:bg-app-surface-glass"
                >
                  Edit
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="rounded-full h-9 px-4 text-xs font-medium bg-brand-primary text-white hover:bg-brand-primary/90"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                  Save
                </Button>
              )}
              <Button
                onClick={handleDownloadPDF}
                size="sm"
                className="rounded-full h-9 px-4 text-xs font-medium bg-app-surface-elevated text-app-text-primary border border-app-border-default hover:bg-app-surface-glass shadow-sm"
              >
                <Download size={14} className="mr-2" />
                Download PDF
              </Button>
            </div>
          }
        />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 relative overflow-y-auto bg-[#f3f4f6]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-app-text-muted animate-spin" />
              </div>
            ) : (
              <>
                <DocumentEditor
                  key={`${id}-${data?.item?.updatedAt}-${historyIndex}`}
                  initialData={content}
                  onChange={(html) => setContent(html)}
                  onSelectionChange={setSelectedContext}
                  readOnly={!isEditing}
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
        className={`fixed right-6 bottom-6 z-50 group flex size-14 cursor-pointer items-center justify-center rounded-full bg-app-primary text-app-primary-foreground shadow-2xl transition-all hover:scale-110 hover:bg-app-primary-hover active:scale-95 ${showChat ? "bg-app-primary text-white hover:bg-brand-primary/90 hidden" : "text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong"
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

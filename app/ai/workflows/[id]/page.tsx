"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  Code,
  FileCode,
  Settings,
  AlertCircle,
  Loader2,
  Copy,
  Terminal,
  Zap,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBrowserExtension } from "@/hooks/use-browser-extension";
import { PageHeader } from "../../_components/page-header";
import { useAI } from "../../_components/ai-provider";

interface WorkflowInput {
  name: string;
  defaultValue: string;
}

interface Workflow {
  _id: string;
  title: string;
  description: string;
  script: string;
  inputs?: WorkflowInput[];
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: result, isLoading, mutate } = useSWR(`/api/workflows/${id}`, fetcher);
  const workflow: Workflow | null = result?.data || null;

  const { isConnected, sendBrowserCommand, openCompanion } = useBrowserExtension();
  const { setSidebarOpen } = useAI();

  useEffect(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  // Local state for editing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [script, setScript] = useState("");
  const [inputs, setInputs] = useState<WorkflowInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for execution
  const [executionInputs, setExecutionInputs] = useState<Record<string, string>>({});

  const preRef = React.useRef<HTMLPreElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = target.scrollTop;
      preRef.current.scrollLeft = target.scrollLeft;
    }
  };

  const simpleHighlight = (code: string) => {
    if (!code) return "";
    let html = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Strings (non-backtracking)
    html = html.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`\\]*(?:\\.[^`\\]*)*`)/g, '<span style="color: #a6e22e;">$1</span>');
    // Comments (line and block comments optimized)
    html = html.replace(/(\/\/.*)/g, '<span style="color: #6272a4;">$1</span>');
    html = html.replace(/\/\*[\s\S]*?\*\//g, '<span style="color: #6272a4;">$&</span>');
    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'new', 'this', 'throw', 'typeof'];
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    html = html.replace(keywordRegex, '<span style="color: #ff79c6;">$1</span>');
    // Methods/Functions
    html = html.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span style="color: #50fa7b;">$1</span>');
    // Numbers
    html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color: #bd93f9;">$1</span>');
    // Booleans/Null
    html = html.replace(/\b(true|false|null|undefined)\b/g, '<span style="color: #bd93f9;">$1</span>');

    return html;
  };

  useEffect(() => {
    if (workflow) {
      setTitle(workflow.title || "");
      setDescription(workflow.description || "");
      setScript(workflow.script || "");
      setInputs(workflow.inputs || []);

      // Initialize execution inputs with defaults
      const initialExecInputs: Record<string, string> = {};
      (workflow.inputs || []).forEach(inp => {
        initialExecInputs[inp.name] = inp.defaultValue || "";
      });
      setExecutionInputs(initialExecInputs);
    }
  }, [workflow]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, script, inputs })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Workflow saved successfully");
        mutate();
      } else {
        toast.error(data.error || "Failed to save workflow");
      }
    } catch (err) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const addInput = () => {
    setInputs([...inputs, { name: "", defaultValue: "" }]);
  };

  const removeInput = (index: number) => {
    const newInputs = [...inputs];
    newInputs.splice(index, 1);
    setInputs(newInputs);
  };

  const updateInput = (index: number, field: keyof WorkflowInput, value: string) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const handleExecute = async () => {
    if (!isConnected) {
      toast.error("Browser extension is not connected. Please make sure the Jarvis extension is active.");
      return;
    }

    if (!script.trim()) {
      toast.error("Script is empty");
      return;
    }

    // Build the inputs object for the sandbox __inputs parameter
    const resolvedInputs: Record<string, any> = {};
    inputs.forEach(inp => {
      resolvedInputs[inp.name] = executionInputs[inp.name] || inp.defaultValue || "";
    });

    try {
      toast.loading("Starting extension side panel...", { id: "workflow-execution" });
      try {
        await openCompanion();
        // Brief delay to allow the side panel environment to fully initialize
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        // We ignore failures here and let the run_workflow_sandbox command handle the error response
      }

      toast.loading("Executing workflow...", { id: "workflow-execution" });
      await sendBrowserCommand({
        action: "run_workflow_sandbox",
        script: script,
        inputs: resolvedInputs
      });
      toast.success("Workflow executed successfully", { id: "workflow-execution" });
    } catch (error: any) {
      toast.error(`Execution failed: ${error.message}`, { id: "workflow-execution" });
    }
  };

  const handleCopyScript = () => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    toast.success("Script copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-canvas text-app-text-primary">
        <Loader2 className="size-8 animate-spin text-app-text-muted" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-app-canvas text-app-text-primary">
        <AlertCircle className="size-12 text-app-text-muted mb-4" />
        <h2 className="text-xl font-bold">Workflow not found</h2>
        <Button onClick={() => router.push("/ai/workflows")} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-app-canvas text-app-text-primary overflow-hidden selection:bg-brand-primary/30">
      {/* Header */}
      <PageHeader
        icon={<Cpu />}
        backHref="/ai/workflows"
        title={
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-7 border-none bg-transparent px-0 font-bold text-lg focus-visible:ring-0 shadow-none focus-visible:ring-offset-0 rounded-none w-[300px] !text-app-text-primary"
            placeholder="Workflow Title"
          />
        }
        subtitle={`Last updated ${new Date(workflow.updatedAt).toLocaleString()}`}
        actions={
          <>
            <Button onClick={handleSave} disabled={isSaving} variant="outline" className="gap-2 border-app-border-default hover:bg-app-surface-glass-strong rounded-full">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            </Button>
            <Button onClick={handleExecute} disabled={!isConnected} className="gap-2 bg-brand-primary rounded-full hover:bg-brand-primary/90 transition-colors text-white border-transparent">
              <Play className="size-4 fill-current" />
              {isConnected ? "Run Workflow" : "Extension Disconnected"}
            </Button>
          </>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Details & Inputs */}
        <div className="w-[420px] bg-app-canvas flex flex-col overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Description Section */}
            <div className="bg-app-surface border border-app-border-default rounded-2xl p-5 space-y-3 shadow-sm hover:border-app-border-hover transition-colors">
              <h3 className="text-sm font-bold text-app-text-primary flex items-center gap-2">
                <div className="size-6 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Settings className="size-3.5 text-zinc-300" />
                </div>
                Workflow Details
              </h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                className="w-full min-h-[100px] p-3 text-sm bg-transparent border border-app-border-default rounded-xl focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 resize-y text-app-text-secondary placeholder:text-app-text-faint transition-all hover:bg-zinc-800/30"
              />
            </div>

            {/* Inputs Section */}
            <div className="bg-app-surface border border-app-border-default rounded-2xl p-5 space-y-4 shadow-sm hover:border-app-border-hover transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-app-text-primary flex items-center gap-2">
                  <div className="size-6 rounded-full bg-sky-500/10 flex items-center justify-center">
                    <Terminal className="size-3.5 text-sky-400" />
                  </div>
                  Script Variables
                </h3>
                <button
                  onClick={addInput}
                  className="p-1.5 rounded-full text-app-text-muted hover:text-sky-400 hover:bg-sky-400/10 transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>

              {inputs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 px-4 bg-app-surface-glass border border-app-border-default border-dashed rounded-xl text-center">
                  <Terminal className="size-8 text-app-text-faint mb-3" />
                  <p className="text-sm font-medium text-app-text-secondary">No variables defined</p>
                  <p className="text-xs text-app-text-muted mt-1">Add variables to inject dynamic data into your script execution.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inputs.map((inp, idx) => (
                    <div key={idx} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-3 space-y-3 relative group focus-within:border-sky-500/30 focus-within:bg-zinc-800/50 transition-all">
                      <button
                        onClick={() => removeInput(idx)}
                        className="absolute -right-2 -top-2 size-6 bg-app-canvas border border-app-border-default rounded-full flex items-center justify-center text-app-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:border-red-400/50 transition-all shadow-sm cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                      </button>
                      <div className="flex flex-col gap-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[11px] font-semibold tracking-wide uppercase text-app-text-muted px-1">Variable Name</label>
                          <Input
                            value={inp.name}
                            onChange={(e) => updateInput(idx, "name", e.target.value)}
                            placeholder="e.g. searchQuery"
                            className="h-9 text-sm font-mono bg-app-surface border-zinc-800 focus-visible:ring-sky-500/30 rounded-full"
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[11px] font-semibold tracking-wide uppercase text-app-text-muted px-1">Default Value</label>
                          <Input
                            value={inp.defaultValue}
                            onChange={(e) => updateInput(idx, "defaultValue", e.target.value)}
                            placeholder="Default value"
                            className="h-9 text-sm bg-app-surface border-zinc-800 focus-visible:ring-sky-500/30 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Form */}
            {inputs.length > 0 && (
              <div className="bg-app-surface border border-brand-primary/20 rounded-2xl p-5 space-y-4 shadow-[0_0_20px_rgba(99,102,241,0.08)] relative overflow-hidden group">
                <h3 className="text-sm font-bold text-app-text-primary flex items-center gap-2">
                  <div className="size-6 rounded-full bg-brand-primary/20 flex items-center justify-center">
                    <Zap className="size-3.5 text-brand-primary" />
                  </div>
                  Execute Workflow
                </h3>
                <div className="space-y-4">
                  {inputs.map((inp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <label className="text-xs font-semibold text-app-text-primary px-1 pb-2 capitalize">
                        {inp.name || `Variable ${idx + 1}`}
                      </label>
                      <Input
                        value={executionInputs[inp.name] ?? inp.defaultValue}
                        onChange={(e) => setExecutionInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                        placeholder={`Value for ${inp.name}`}
                        className="h-10 bg-zinc-800/50 border-zinc-800 focus-visible:ring-indigo-500/50 rounded-full"
                      />
                    </div>
                  ))}
                  <Button
                    onClick={handleExecute}
                    disabled={!isConnected}
                    className="w-full gap-2 bg-brand-primary hover:bg-brand-primary/90 transition-all text-app-primary mt-4 h-10 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
                  >
                    <Play className="size-4 fill-current" />
                    {isConnected ? "Execute Now" : "Extension Disconnected"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative border-l border-app-border-default">
          <div className="h-12 flex items-center justify-between px-4 border-b border-app-border-default bg-[#010409]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
                <FileCode className="size-3.5" />
                script.js
              </div>
            </div>
            <button
              onClick={handleCopyScript}
              className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Copy script"
            >
              <Copy className="size-3.5" />
              Copy
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <pre
              ref={preRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full p-6 bg-transparent text-[#f8f8f2] font-mono text-sm leading-relaxed pointer-events-none overflow-auto whitespace-pre select-none"
              dangerouslySetInnerHTML={{ __html: simpleHighlight(script) + (script.endsWith('\n') ? ' ' : '') }}
            />
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-6 bg-transparent text-transparent caret-[#f8f8f2] font-mono text-sm leading-relaxed resize-none outline-none focus:outline-none selection:bg-indigo-500/30 overflow-auto whitespace-pre"
              placeholder="// Write your JavaScript automation here..."
              style={{
                tabSize: 2,
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
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
  Cpu,
  Globe,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBrowserExtension } from "@/hooks/use-browser-extension";
import { PageHeader } from "../../_components/page-header";
import { useAI } from "../../_components/ai-provider";
import { WorkflowRightPanel } from "./workflow-right-panel";

export interface WorkflowInput {
  name: string;
  defaultValue: string;
  type?: "text" | "largetext" | "boolean" | "select" | "file";
  options?: string[];
  required?: boolean;
}

interface Workflow {
  _id: string;
  title: string;
  description: string;
  script: string;
  inputs?: WorkflowInput[];
  userId: string;
  isPublic: boolean;
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

  const { data: session } = useSession();
  const isOwner = session?.user?.id === workflow?.userId;

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
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  console.log(inputs, "tara inputs")

  // Local state for execution
  const [executionInputs, setExecutionInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (workflow) {
      setTitle(workflow.title || "");
      setDescription(workflow.description || "");
      setScript(workflow.script || "");
      setInputs(workflow.inputs || []);
      setIsPublic(workflow.isPublic || false);

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
        body: JSON.stringify({ title, description, script, inputs, isPublic })
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
    for (const inp of inputs) {
      const val = executionInputs[inp.name] !== undefined ? executionInputs[inp.name] : (inp.defaultValue || "");
      if (inp.required && val === "") {
        toast.error(`Variable "${inp.name}" is required.`);
        return;
      }
      resolvedInputs[inp.name] = val;
    }

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
              disabled={!isOwner}
              className="h-7 border-none bg-transparent px-0 font-bold text-lg focus-visible:ring-0 shadow-none focus-visible:ring-offset-0 rounded-none w-[300px] !text-app-text-primary"
              placeholder="Workflow Title"
            />
        }
        subtitle={`Last updated ${new Date(workflow.updatedAt).toLocaleString()}`}
        actions={
          <>
            {isOwner && (
              <Button onClick={handleSave} disabled={isSaving} variant="outline" className="gap-2 border-app-border-default hover:bg-app-surface-glass-strong rounded-full">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              </Button>
            )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-app-text-primary flex items-center gap-2">
                  <div className="size-6 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Settings className="size-3.5 text-zinc-300" />
                  </div>
                  Workflow Details
                </h3>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPublic(!isPublic)}
                    className={cn(
                      "h-8 rounded-full text-xs gap-1.5",
                      isPublic ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-zinc-400 bg-zinc-800 hover:bg-zinc-700"
                    )}
                  >
                    {isPublic ? (
                      <><Globe className="size-3.5" /> Public</>
                    ) : (
                      <><Lock className="size-3.5" /> Private</>
                    )}
                  </Button>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={!isOwner}
                placeholder="Describe what this workflow does..."
                className="w-full min-h-[100px] p-1 text-sm bg-transparent border border-transparent rounded-lg focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 resize-y text-app-text-secondary placeholder:text-app-text-faint transition-all hover:bg-zinc-800/30"
              />
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
                    <div key={idx} className="space-y-0">
                      <label className="text-xs font-semibold text-app-text-primary px-1 pb-2 capitalize flex items-center gap-1">
                        {inp.name || `Variable ${idx + 1}`}
                        {inp.required && <span className="text-red-500">*</span>}
                      </label>
                      {inp.type === "largetext" ? (
                        <textarea
                          value={executionInputs[inp.name] ?? inp.defaultValue}
                          onChange={(e) => setExecutionInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                          placeholder={`Value for ${inp.name}`}
                          className="w-full min-h-[80px] p-3 text-sm bg-zinc-800/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500/50 resize-y text-app-text-primary"
                        />
                      ) : inp.type === "boolean" ? (
                        <select
                          value={executionInputs[inp.name] ?? inp.defaultValue}
                          onChange={(e) => setExecutionInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                          className="w-full h-10 px-3 bg-zinc-800/50 border border-zinc-800 rounded-full text-sm text-app-text-primary focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                        >
                          <option value="false">False</option>
                          <option value="true">True</option>
                        </select>
                      ) : inp.type === "select" ? (
                        <select
                          value={executionInputs[inp.name] ?? inp.defaultValue}
                          onChange={(e) => setExecutionInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                          className="w-full h-10 px-3 bg-zinc-800/50 border border-zinc-800 rounded-full text-sm text-app-text-primary focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                        >
                          {(inp.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : inp.type === "file" ? (
                        <div className="space-y-2">
                          <input
                            type="file"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setExecutionInputs(prev => ({ ...prev, [inp.name]: base64 }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="block w-full text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                          />
                          {(executionInputs[inp.name] || inp.defaultValue) && (
                            <p className="text-[10px] text-zinc-500 truncate px-1">
                              File loaded (Base64)
                            </p>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={executionInputs[inp.name] ?? inp.defaultValue}
                          onChange={(e) => setExecutionInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                          placeholder={`Value for ${inp.name}`}
                          className="h-10 bg-zinc-800/50 border-zinc-800 focus-visible:ring-indigo-500/50 rounded-full"
                        />
                      )}
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

        {/* Right Panel: Code Editor & Variables */}
        <WorkflowRightPanel
          script={script}
          setScript={setScript}
          inputs={inputs}
          setInputs={setInputs}
          isOwner={isOwner}
        />

      </div>
    </div>
  );
}

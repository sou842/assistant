'use client';

import React, { useState } from 'react';
import { useToolRegistry } from '@/lib/workflow/registry';
import { Node } from '@xyflow/react';
import { Cable, Bot, Forward, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigPanelProps {
  selectedNode: Node | null;
  updateNodeConfig: (nodeId: string, config: Record<string, any>) => void;
}

export function ConfigPanel({ selectedNode, updateNodeConfig }: ConfigPanelProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { getTool } = useToolRegistry();

  if (!selectedNode) {
    return (
      <aside className="w-80 h-full border-l bg-background/50 backdrop-blur-xl flex flex-col items-center justify-center text-muted-foreground shadow-xl z-10 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 mb-4 flex items-center justify-center border border-app-border-default">
          <Cable className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Select a node to configure</p>
      </aside>
    );
  }

  const currentConfig = (selectedNode.data.config as Record<string, any>) || {};
  let tool = getTool(selectedNode.data.toolId as string);

  if (!tool) {
    const dynamicInputs = Object.keys(currentConfig).map(key => ({
      name: key,
      type: typeof currentConfig[key] === 'boolean' ? 'boolean' : 'string',
      description: `Configuration field`,
      isConnection: false,
      required: false
    }));

    tool = {
      id: selectedNode.data.toolId as string,
      name: (selectedNode.data.toolId as string).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: "Schedule Action",
      icon: "Activity",
      inputs: dynamicInputs,
      outputs: [],
      execute: async () => ({})
    } as any;
  }

  const staticInputs = tool!.inputs.filter((i) => !i.isConnection);

  const handleChange = (name: string, value: any) => {
    updateNodeConfig(selectedNode.id, {
      ...currentConfig,
      [name]: value,
    });
  };

  const handleAIConfig = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/workflow/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentConfig,
          toolName: tool!.name
        })
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to generate config");
        return;
      }

      // Update the node with the AI generated config
      updateNodeConfig(selectedNode.id, json.config);
      setAiPrompt("");
      toast.success("Configuration updated by AI");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <aside className="w-[360px] h-full border-l border-app-border-default bg-background/80 backdrop-blur-2xl flex flex-col shadow-2xl z-10 relative">
      <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
        <h2 className="text-[13px] font-bold text-foreground">Configure Node</h2>
        <p className="text-[10px] text-muted-foreground font-mono mt-1">{tool!.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">

        {/* Configuration Fields */}
        <div className="p-6 flex flex-col gap-6">
          {staticInputs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-muted/20 rounded-2xl border border-dashed border-border/50">
              <Cable className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">No configuration required.</p>
            </div>
          ) : (
            staticInputs?.map((input) => {
              const rawValue = currentConfig[input?.name];
              const displayValue = typeof rawValue === 'object' && rawValue !== null
                ? JSON.stringify(rawValue, null, 2)
                : rawValue || '';

              return (
                <div key={input?.name} className="flex flex-col gap-2 relative group">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    {input?.name}
                    {input?.required && <span className="text-red-500">*</span>}
                  </label>
                  {input?.description && (
                    <p className="text-[10px] text-muted-foreground/80 -mt-1 mb-1 leading-relaxed">{input.description}</p>
                  )}

                  {input?.type === 'string' ? (
                    <textarea
                      className="flex min-h-[100px] w-full rounded-xl border border-border/60 bg-muted/10 px-3 py-3 text-[11px] font-mono shadow-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all custom-scrollbar"
                      value={displayValue}
                      onChange={(e) => handleChange(input.name, e.target.value)}
                      placeholder={`Enter ${input.name}...`}
                    />
                  ) : input?.type === 'boolean' ? (
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-muted/10 border border-border/60 hover:border-primary/30 transition-all">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-muted-foreground/30 bg-background"
                        checked={!!rawValue}
                        onChange={(e) => handleChange(input.name, e.target.checked)}
                      />
                      <span className="text-xs font-medium">Enabled</span>
                    </label>
                  ) : (
                    <input
                      type="text"
                      className="flex h-10 w-full rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-xs shadow-sm transition-all placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50"
                      value={displayValue}
                      onChange={(e) => handleChange(input.name, e.target.value)}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Display Output Result if available */}
          {(selectedNode.data.state as any)?.result && (
            <div className="mt-4 pt-6 border-t border-border">
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                Execution Result
              </h3>
              <div className="bg-[#0d1117] rounded-xl p-3 border border-border overflow-hidden">
                <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[250px] overflow-y-auto scrollbar-thin">
                  {JSON.stringify((selectedNode.data.state as any).result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="p-3 border-b border-border/50">

        <div className="bg-background/80 backdrop-blur-xl border border-primary/20 p-2 rounded-2xl shadow-sm flex flex-col relative overflow-hidden transition-all focus-within:border-primary/50 focus-within:shadow-primary/20 focus-within:ring-4 focus-within:ring-primary/10">
          <textarea
            className="w-full min-h-[60px] bg-transparent border-none p-2 text-xs focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 resize-none"
            placeholder="E.g. Change the message to be friendly and translate to French..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAIConfig();
              }
            }}
          />
          <div className="flex justify-end mt-1">
            <button
              onClick={handleAIConfig}
              disabled={isGenerating || !aiPrompt.trim()}
              className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Forward className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

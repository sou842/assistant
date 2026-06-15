'use client';

import React, { useState } from 'react';
import { useToolRegistry } from '@/lib/workflow/registry';
import { Node } from '@xyflow/react';
import { Cable, Bot, Sparkles, Loader2 } from 'lucide-react';
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
        <div className="w-16 h-16 rounded-2xl bg-muted/50 mb-4 flex items-center justify-center border border-dashed">
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
    <aside className="w-[350px] h-full border-l bg-background/80 backdrop-blur-xl flex flex-col shadow-2xl z-10 relative">
      <div className="px-5 py-4 border-b bg-muted/20">
        <h2 className="text-sm font-bold text-foreground">Configure Node</h2>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{tool!.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* AI Assistant Section */}
        <div className="p-5 border-b bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="size-4 text-primary" />
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">AI Assistant</h3>
          </div>
          <div className="relative">
            <textarea
              className="w-full min-h-[70px] bg-background rounded-xl border border-primary/20 p-3 pr-10 text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/60 resize-none"
              placeholder="E.g. Change the message to be friendly and translate it to French..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAIConfig();
                }
              }}
            />
            <button
              onClick={handleAIConfig}
              disabled={isGenerating || !aiPrompt.trim()}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Configuration Fields */}
        <div className="p-5 flex flex-col gap-6">
          {staticInputs?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center italic py-10 bg-muted/30 rounded-xl border border-dashed">
              No static configuration required for this tool.
            </p>
          ) : (
            staticInputs?.map((input) => {
              const rawValue = currentConfig[input?.name];
              const displayValue = typeof rawValue === 'object' && rawValue !== null 
                ? JSON.stringify(rawValue, null, 2) 
                : rawValue || '';

              return (
                <div key={input?.name} className="flex flex-col gap-2 relative">
                  <label className="text-xs font-bold text-foreground flex items-center gap-2">
                    {input?.name}
                    {input?.required && <span className="text-red-500">*</span>}
                  </label>
                  {input?.description && (
                    <p className="text-[10px] text-muted-foreground -mt-1 mb-1 leading-tight">{input.description}</p>
                  )}

                  {input?.type === 'string' ? (
                    <textarea
                      className="flex min-h-[100px] w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-all"
                      value={displayValue}
                      onChange={(e) => handleChange(input.name, e.target.value)}
                      placeholder={`Enter ${input.name}...`}
                    />
                  ) : input?.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-muted-foreground"
                        checked={!!rawValue}
                        onChange={(e) => handleChange(input.name, e.target.checked)}
                      />
                      <span className="text-sm">Enabled</span>
                    </label>
                  ) : (
                    <input
                      type="text"
                      className="flex h-9 w-full rounded-lg border border-border bg-muted/20 px-3 py-1 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
    </aside>
  );
}

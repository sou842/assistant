import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FileCode, Terminal, Copy, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { WorkflowInput } from "./page";

interface WorkflowRightPanelProps {
  script: string;
  setScript: (val: string) => void;
  inputs: WorkflowInput[];
  setInputs: React.Dispatch<React.SetStateAction<WorkflowInput[]>>;
  isOwner?: boolean;
}

export function WorkflowRightPanel({
  script,
  setScript,
  inputs,
  setInputs,
  isOwner = false,
}: WorkflowRightPanelProps) {
  const [rightTab, setRightTab] = useState<"script" | "variables">("script");
  const preRef = useRef<HTMLPreElement>(null);

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

  const handleCopyScript = () => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    toast.success("Script copied to clipboard");
  };

  const addInput = () => {
    setInputs([...inputs, { name: "", defaultValue: "", type: "text" }]);
  };

  const removeInput = (index: number) => {
    const newInputs = [...inputs];
    newInputs.splice(index, 1);
    setInputs(newInputs);
  };

  const updateInput = (index: number, field: keyof WorkflowInput, value: any) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setInputs(newInputs);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] relative border-l border-app-border-default">
      <div className="h-12 flex items-center justify-between px-4 border-b border-app-border-default bg-[#010409]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 mr-2">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex bg-zinc-950 p-0.5 rounded-full border border-zinc-800/80">
            <button
              onClick={() => setRightTab("script")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                rightTab === "script"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <FileCode className="size-3.5" />
              Script
            </button>
            <button
              onClick={() => setRightTab("variables")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                rightTab === "variables"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Terminal className="size-3.5" />
              Script Variables
            </button>
          </div>
        </div>
        {rightTab === "script" && (
          <button
            onClick={handleCopyScript}
            className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Copy script"
          >
            <Copy className="size-3.5" />
            Copy
          </button>
        )}
      </div>
      <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
        {rightTab === "script" ? (
          <>
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
              readOnly={!isOwner}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-6 bg-transparent text-transparent caret-[#f8f8f2] font-mono text-sm leading-relaxed resize-none outline-none focus:outline-none selection:bg-indigo-500/30 overflow-auto whitespace-pre"
              placeholder="// Write your JavaScript automation here..."
              style={{
                tabSize: 2,
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 overflow-y-auto p-6 bg-app-canvas">
            <div className="w-full mx-auto space-y-6">
              <div className="bg-app-surface border border-app-border-default rounded-2xl p-6 space-y-6 shadow-sm hover:border-app-border-hover transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-app-text-primary flex items-center gap-2">
                      <Terminal className="size-4 text-brand-primary" />
                      Script Variables
                    </h3>
                    <p className="text-xs text-app-text-muted mt-1">Define variables that will be injected into your script execution.</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={addInput}
                      className="px-3.5 py-2 rounded-full text-white bg-brand-primary hover:bg-brand-primary/80 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="size-4" />
                      Add Variable
                    </button>
                  )}
                </div>

                {inputs?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-zinc-900/10 border border-zinc-800 border-dashed rounded-full text-center">
                    <Terminal className="size-10 text-app-text-faint mb-3" />
                    <p className="text-sm font-medium text-app-text-secondary">No variables defined</p>
                    <p className="text-xs text-app-text-muted mt-1 max-w-sm">Add variables to inject dynamic data into your script execution when running it.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inputs?.map((inp, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 focus-within:border-brand-primary/40"
                      >
                        {/* Delete */}
                        {isOwner && (
                          <button
                            onClick={() => removeInput(idx)}
                            className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* First Row */}
                        <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto] items-end">
                          {/* Variable Name */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              Variable Name
                            </label>

                            <Input
                              value={inp.name}
                              onChange={(e) => updateInput(idx, "name", e.target.value)}
                              disabled={!isOwner}
                              placeholder="searchQuery"
                              className="h-11 rounded-full border-zinc-800 bg-zinc-950 font-mono"
                            />
                          </div>

                          {/* Type */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              Type
                            </label>

                            <select
                              value={inp.type || "text"}
                              onChange={(e) => updateInput(idx, "type", e.target.value)}
                              disabled={!isOwner}
                              className="h-11 w-full rounded-full border border-zinc-800 bg-zinc-950 px-3 text-sm outline-none focus:border-brand-primary/40 disabled:opacity-50"
                            >
                              <option value="text">Text</option>
                              <option value="largetext">Large Text</option>
                              <option value="boolean">Boolean</option>
                              <option value="select">Select</option>
                              <option value="file">File</option>
                            </select>
                          </div>

                          {/* Required */}
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => updateInput(idx, "required", !inp.required)}
                              disabled={!isOwner}
                              className={cn(
                                "h-11 px-4 rounded-full border text-sm font-medium transition-all flex items-center justify-center gap-2.5 select-none",
                                isOwner ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 flex items-center",
                                inp.required ? "bg-brand-primary" : "bg-zinc-800"
                              )}>
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 shadow-sm",
                                  inp.required ? "translate-x-3.5" : "translate-x-0"
                                )} />
                              </div>
                              Required
                            </button>
                          </div>
                        </div>

                        {/* Second Row */}
                        <div className="mt-5">
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Default Value
                          </label>

                          <Input
                            value={inp.defaultValue}
                            onChange={(e) =>
                              updateInput(idx, "defaultValue", e.target.value)
                            }
                            disabled={!isOwner}
                            placeholder="Enter default value..."
                            className="h-11 rounded-full border-zinc-800 bg-zinc-950"
                          />
                        </div>

                        {/* Third Row (Select only) */}
                        {inp.type === "select" && (
                          <div className="mt-5">
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              Options
                            </label>

                            <Input
                              value={inp.options?.join(", ") || ""}
                              onChange={(e) =>
                                updateInput(
                                  idx,
                                  "options",
                                  e.target.value.split(",").map((s) => s.trim())
                                )
                              }
                              disabled={!isOwner}
                              placeholder="Option 1, Option 2, Option 3"
                              className="h-11 rounded-full border-zinc-800 bg-zinc-950"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import {
  Play,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Workflow as WorkflowIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  X,
} from "lucide-react";
import { useState } from "react";

export function WorkflowsTab({
  activeTab,
  workflows,
  expandedWorkflow,
  setExpandedWorkflow,
  workflowInputs,
  setWorkflowInputs,
  runWorkflow,
}: any) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [workflowTab, setWorkflowTab] = useState<"script" | "variables">("variables");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<Record<string, "success" | "error" | undefined>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyScript = (e: React.MouseEvent, id: string, script: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(script || "");
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const getMissingRequired = (w: any) => {
    if (!w.inputs || !Array.isArray(w.inputs)) return [];
    const values = workflowInputs[w._id] || {};
    return w.inputs.filter((input: any) => {
      if (!input.required) return false;
      const val = values[input.name] !== undefined ? values[input.name] : input.defaultValue;
      return val === undefined || val === null || val === "";
    });
  };

  const handleRun = async (w: any) => {
    const missing = getMissingRequired(w);
    if (missing.length > 0) {
      setTouchedFields((prev) => ({
        ...prev,
        ...Object.fromEntries(missing.map((m: any) => [`${w._id}:${m.name}`, true])),
      }));
      setWorkflowTab("variables");
      return;
    }
    setRunningId(w._id);
    setRunStatus((prev) => ({ ...prev, [w._id]: undefined }));
    try {
      await runWorkflow(w);
      setRunStatus((prev) => ({ ...prev, [w._id]: "success" }));
    } catch (err) {
      setRunStatus((prev) => ({ ...prev, [w._id]: "error" }));
    } finally {
      setRunningId(null);
      setTimeout(() => {
        setRunStatus((prev) => ({ ...prev, [w._id]: undefined }));
      }, 3500);
    }
  };

  const updateField = (workflowId: string, name: string, value: any) => {
    setWorkflowInputs({
      ...workflowInputs,
      [workflowId]: { ...workflowInputs[workflowId], [name]: value },
    });
  };

  const activeWorkflowData = expandedWorkflow ? workflows.find((w: any) => w._id === expandedWorkflow) : null;

  return (
    <div
      className={`flex-1 overflow-y-auto p-3 space-y-3 ${activeTab === "workflows" ? "block" : "hidden"
        }`}
    >
      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
            <WorkflowIcon size={16} className="text-gray-500" />
          </div>
          <p className="text-xs font-medium text-gray-300">No workflows yet</p>
          <p className="text-[11px] text-gray-500 mt-1 max-w-[220px]">
            Workflows you create will show up here, ready to configure and run.
          </p>
        </div>
      ) : activeWorkflowData ? (
        // --- DETAIL VIEW (Single Workflow) ---
        <div className="flex flex-col space-y-4 animate-in slide-in-from-right-4 duration-300 fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setExpandedWorkflow(null)}
              className="p-1.5 -ml-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              aria-label="Back to workflows list"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold text-gray-200 truncate pr-2 flex-1">
              {activeWorkflowData.title}
            </h2>
          </div>

          {activeWorkflowData.description && (
            <p className="text-xs text-gray-400 -mt-2 leading-relaxed">{activeWorkflowData.description}</p>
          )}

          {/* Form Content */}
          <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-md">
            <div className="p-4 space-y-4">
              {(() => {
                const w = activeWorkflowData;
                const isRunning = runningId === w._id;
                const status = runStatus[w._id];
                const inputCount = Array.isArray(w.inputs) ? w.inputs.length : 0;
                const missingRequired = getMissingRequired(w);

                return (
                  <>
                    <div className="flex bg-[#0a0a0a] rounded-full p-1 gap-1 border border-white/5">
                      <button
                        onClick={() => setWorkflowTab("variables")}
                        className={`flex-1 text-[10px] py-1.5 font-medium rounded-full transition flex items-center justify-center gap-2 cursor-pointer ${workflowTab === "variables"
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-300"
                          }`}
                      >
                        Variables
                        {inputCount > 0 && (
                          <span
                            className={`text-[9px] rounded-full px-1.5 leading-4 ${workflowTab === "variables"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-white/10 text-gray-500"
                              }`}
                          >
                            {inputCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setWorkflowTab("script")}
                        className={`flex-1 text-[10px] py-1.5 font-medium rounded-full transition cursor-pointer ${workflowTab === "script"
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-300"
                          }`}
                      >
                        Script
                      </button>
                    </div>

                    {workflowTab === "variables" &&
                      (w.inputs && Array.isArray(w.inputs) && w.inputs.length > 0 ? (
                        <div className="space-y-4">
                          {w.inputs.map((inputSchema: any, idx: number) => {
                            const val =
                              (workflowInputs[w._id] || {})[inputSchema.name] !== undefined
                                ? (workflowInputs[w._id] || {})[inputSchema.name]
                                : inputSchema.defaultValue || "";
                            const fieldKey = `${w._id}:${inputSchema.name}`;
                            const isMissing =
                              inputSchema.required &&
                              touchedFields[fieldKey] &&
                              (val === undefined || val === null || val === "");

                            return (
                              <div key={idx} className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-300 font-medium flex items-center gap-1">
                                  {inputSchema.label || inputSchema.name}
                                  {inputSchema.required && (
                                    <span className="text-red-400" aria-hidden="true">*</span>
                                  )}
                                </label>

                                {inputSchema.type === "largetext" ? (
                                  <textarea
                                    className={`w-full bg-[#0a0a0a] border rounded-md p-2.5 text-xs text-gray-200 resize-none outline-none transition focus:ring-1 ${isMissing
                                        ? "border-red-500/50 focus:ring-red-500/50"
                                        : "border-white/10 focus:border-blue-500/50 focus:ring-blue-500/50"
                                      }`}
                                    rows={3}
                                    value={val}
                                    onBlur={() =>
                                      setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                                    }
                                    onChange={(e) =>
                                      updateField(w._id, inputSchema.name, e.target.value)
                                    }
                                  />
                                ) : inputSchema.type === "select" ? (
                                  <select
                                    className={`w-full bg-[#0a0a0a] border rounded-full p-2.5 text-xs text-gray-200 outline-none transition focus:ring-1 ${isMissing
                                        ? "border-red-500/50 focus:ring-red-500/50"
                                        : "border-white/10 focus:border-blue-500/50 focus:ring-blue-500/50"
                                      }`}
                                    value={val}
                                    onBlur={() =>
                                      setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                                    }
                                    onChange={(e) =>
                                      updateField(w._id, inputSchema.name, e.target.value)
                                    }
                                  >
                                    <option value="">Select an option...</option>
                                    {(inputSchema.options || []).map((opt: string) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : inputSchema.type === "boolean" ? (
                                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer w-fit mt-1">
                                    <input
                                      type="checkbox"
                                      className="accent-blue-600 rounded-full bg-[#0a0a0a] border-white/10 w-4 h-4 cursor-pointer"
                                      checked={val === "true" || val === true}
                                      onChange={(e) =>
                                        updateField(w._id, inputSchema.name, e.target.checked)
                                      }
                                    />
                                    <span>Enable {inputSchema.label || inputSchema.name}</span>
                                  </label>
                                ) : inputSchema.type === "file" ? (
                                  <div className="space-y-1">
                                    {val ? (
                                      <div className="flex items-center justify-between gap-2 bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Paperclip size={14} className="text-gray-500 shrink-0" />
                                          <span className="text-xs text-gray-300 truncate">
                                            {workflowInputs[w._id]?.[`${inputSchema.name}__name`] ||
                                              "File attached"}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const next = { ...(workflowInputs[w._id] || {}) };
                                            delete next[inputSchema.name];
                                            delete next[`${inputSchema.name}__name`];
                                            setWorkflowInputs({ ...workflowInputs, [w._id]: next });
                                          }}
                                          aria-label="Remove file"
                                          className="p-1 text-gray-500 hover:text-red-400 transition"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <input
                                        type="file"
                                        className={`block w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer ${isMissing ? "ring-1 ring-red-500/50 rounded-md" : ""
                                          }`}
                                        onBlur={() =>
                                          setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                                        }
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              const base64 = event.target?.result as string;
                                              setWorkflowInputs({
                                                ...workflowInputs,
                                                [w._id]: {
                                                  ...workflowInputs[w._id],
                                                  [inputSchema.name]: base64,
                                                  [`${inputSchema.name}__name`]: file.name,
                                                },
                                              });
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    className={`w-full bg-[#0a0a0a] border rounded-full px-3 py-2.5 text-xs text-gray-200 outline-none transition focus:ring-1 ${isMissing
                                        ? "border-red-500/50 focus:ring-red-500/50"
                                        : "border-white/10 focus:border-blue-500/50 focus:ring-blue-500/50"
                                      }`}
                                    value={val}
                                    onBlur={() =>
                                      setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                                    }
                                    onChange={(e) =>
                                      updateField(w._id, inputSchema.name, e.target.value)
                                    }
                                  />
                                )}

                                {isMissing && (
                                  <span className="text-[10px] text-red-400 font-medium">
                                    This field is required
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div>
                          <div className="text-[10px] text-gray-500 font-mono mb-1 tracking-widest uppercase">
                            Inputs (JSON)
                          </div>
                          <textarea
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-3 text-xs font-mono text-gray-300 resize-none h-24 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                            placeholder={'{\n  "url": "https://..."\n}'}
                            value={typeof workflowInputs[w._id] === "string" ? workflowInputs[w._id] : ""}
                            onChange={(e) =>
                              setWorkflowInputs({ ...workflowInputs, [w._id]: e.target.value })
                            }
                          />
                        </div>
                      ))}

                    {workflowTab === "script" && (
                      <div className="relative bg-[#0a0a0a] border border-white/5 rounded-md p-3">
                        <button
                          onClick={(e) => handleCopyScript(e, w._id, w.script)}
                          aria-label="Copy script"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center gap-1.5 text-[10px] cursor-pointer"
                        >
                          {copiedScript === w._id ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <pre className="text-[10px] text-gray-400 overflow-x-auto font-mono leading-relaxed max-h-60 overflow-y-auto pr-8">
                          {w.script}
                        </pre>
                      </div>
                    )}

                    {missingRequired.length > 0 && workflowTab === "script" && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md">
                        <AlertCircle size={14} />
                        <span>
                          {missingRequired.length} required variable{missingRequired.length > 1 ? "s" : ""} need{missingRequired.length === 1 ? "s" : ""} a value
                        </span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => handleRun(w)}
                        disabled={isRunning}
                        className={`w-full py-2.5 rounded-full cursor-pointer text-sm font-semibold shadow-lg transition flex items-center justify-center gap-2 ${isRunning
                            ? "bg-blue-600/50 text-white/70 cursor-not-allowed shadow-none"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-[0.98]"
                          }`}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play size={14} fill="currentColor" />
                            Execute Workflow
                          </>
                        )}
                      </button>
                    </div>

                    {status && (
                      <div
                        className={`flex items-center gap-2 text-xs font-medium rounded-md px-3 py-2 border ${status === "success"
                            ? "text-green-400 bg-green-500/5 border-green-500/20"
                            : "text-red-400 bg-red-500/5 border-red-500/20"
                          }`}
                      >
                        {status === "success" ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Workflow ran successfully</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} />
                            <span>Workflow failed to run</span>
                          </>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        // --- LIST VIEW (Master) ---
        <div className="space-y-2 pb-8 animate-in slide-in-from-left-4 duration-300 fade-in">
          {workflows.map((w: any) => {
            return (
              <div
                key={w._id}
                className="bg-[#111] border border-white/5 hover:border-blue-500/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedWorkflow(w._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedWorkflow(w._id);
                    }
                  }}
                  className="relative p-4 flex justify-between items-center gap-3 cursor-pointer hover:bg-white/5 transition"
                >
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-sm font-medium text-gray-200 truncate group-hover:text-blue-400 transition-colors">
                      {w.title}
                    </h3>
                    {w.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{w.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleCopyId(e, w._id)}
                      aria-label="Copy workflow ID"
                      className="p-1.5 opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition cursor-pointer flex items-center gap-1.5 text-[10px]"
                      title="Copy Workflow ID"
                    >
                      {copiedId === w._id ? (
                        <>
                          <Check size={12} className="text-green-500" />
                          <span className="text-green-500 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span className="opacity-60">ID</span>
                        </>
                      )}
                    </button>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
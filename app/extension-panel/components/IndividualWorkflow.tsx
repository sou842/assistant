import {
  Play,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  X,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useState } from "react";

interface IndividualWorkflowProps {
  w: any;
  logoUrl?: string | null;
  onBack: () => void;
  workflowInputs: any;
  setWorkflowInputs: (inputs: any) => void;
  runWorkflow: (w: any) => Promise<any>;
}

export function IndividualWorkflow({
  w,
  logoUrl,
  onBack,
  workflowInputs,
  setWorkflowInputs,
  runWorkflow,
}: IndividualWorkflowProps) {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [workflowTab, setWorkflowTab] = useState<"script" | "variables">("variables");
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | undefined>(undefined);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const handleCopyScript = (e: React.MouseEvent, id: string, script: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(script || "");
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const getMissingRequired = () => {
    if (!w.inputs || !Array.isArray(w.inputs)) return [];
    const values = workflowInputs[w._id] || {};
    return w.inputs.filter((input: any) => {
      if (!input.required) return false;
      const val = values[input.name] !== undefined ? values[input.name] : input.defaultValue;
      return val === undefined || val === null || val === "";
    });
  };

  const handleRun = async () => {
    const missing = getMissingRequired();
    if (missing.length > 0) {
      setTouchedFields((prev) => ({
        ...prev,
        ...Object.fromEntries(missing.map((m: any) => [`${w._id}:${m.name}`, true])),
      }));
      setWorkflowTab("variables");
      return;
    }
    setIsRunning(true);
    setStatus(undefined);
    try {
      await runWorkflow(w);
      setStatus("success");
    } catch (err) {
      setStatus("error");
    } finally {
      setIsRunning(false);
      setTimeout(() => {
        setStatus(undefined);
      }, 3500);
    }
  };

  const updateField = (name: string, value: any) => {
    setWorkflowInputs({
      ...workflowInputs,
      [w._id]: { ...workflowInputs[w._id], [name]: value },
    });
  };

  const inputCount = Array.isArray(w.inputs) ? w.inputs.length : 0;
  const missingRequired = getMissingRequired();

  return (
    <div className="flex flex-col space-y-4 animate-in slide-in-from-right-4 duration-300 fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
          aria-label="Back to workflows list"
        >
          <ArrowLeft size={16} />
        </button>
        
        {/* Logo/Icon beside Title */}
        <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-3.5 h-3.5 object-contain" />
          ) : (
            <WorkflowIcon size={11} className="text-blue-400" />
          )}
        </div>

        <h2 className="text-sm font-semibold text-gray-200 truncate pr-2 flex-1">
          {w.title}
        </h2>
      </div>

      {w.description && (
        <p className="text-xs text-gray-400 -mt-2 leading-relaxed">{w.description}</p>
      )}

      {/* Form Content */}
      <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-md">
        <div className="p-4 space-y-4">
          <div className="flex bg-[#0a0a0a] rounded-full p-1 gap-1 border border-white/5">
            <button
              onClick={() => setWorkflowTab("variables")}
              className={`flex-1 text-[10px] py-1.5 font-medium rounded-full transition flex items-center justify-center gap-2 cursor-pointer ${
                workflowTab === "variables"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Variables
              {inputCount > 0 && (
                <span
                  className={`text-[9px] rounded-full px-1.5 leading-4 ${
                    workflowTab === "variables"
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
              className={`flex-1 text-[10px] py-1.5 font-medium rounded-full transition cursor-pointer ${
                workflowTab === "script"
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
                          <span className="text-red-400" aria-hidden="true">
                            *
                          </span>
                        )}
                      </label>

                      {inputSchema.type === "largetext" ? (
                        <textarea
                          className={`w-full bg-[#0a0a0a] border rounded-lg p-2.5 text-xs text-gray-200 resize-none outline-none transition focus:ring-1 ${
                            isMissing
                              ? "border-red-500/50 focus:ring-red-500/50"
                              : "border-white/10 focus:border-blue-500/50 focus:ring-blue-500/50"
                          }`}
                          rows={3}
                          value={val}
                          onBlur={() =>
                            setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                          }
                          onChange={(e) => updateField(inputSchema.name, e.target.value)}
                        />
                      ) : inputSchema.type === "select" ? (
                        <select
                          className={`w-full bg-[#0a0a0a] border rounded-full p-2.5 text-xs text-gray-200 outline-none transition focus:ring-1 ${
                            isMissing
                              ? "border-red-500/50 focus:ring-red-500/50"
                              : "border-white/10 focus:border-blue-500/50 focus:ring-blue-500/50"
                          }`}
                          value={val}
                          onBlur={() =>
                            setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                          }
                          onChange={(e) => updateField(inputSchema.name, e.target.value)}
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
                              updateField(inputSchema.name, e.target.checked)
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
                              className={`block w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer ${
                                isMissing ? "ring-1 ring-red-500/50 rounded-md" : ""
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
                          className={`w-full bg-[#0a0a0a] border rounded-full px-3 py-2.5 text-xs text-gray-200 outline-none transition focus:ring-1 ${
                            isMissing
                              ? "border-red-500/50 focus:ring-red-500/50"
                              : "border-white/10 focus:border-blue-500/50 focus:ring-blue-500/50"
                          }`}
                          value={val}
                          onBlur={() =>
                            setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                          }
                          onChange={(e) => updateField(inputSchema.name, e.target.value)}
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
                  value={
                    typeof workflowInputs[w._id] === "string"
                      ? workflowInputs[w._id]
                      : ""
                  }
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
                {missingRequired.length} required variable
                {missingRequired.length > 1 ? "s" : ""} need
                {missingRequired.length === 1 ? "s" : ""} a value
              </span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`w-full py-2.5 rounded-full cursor-pointer text-sm font-semibold shadow-lg transition flex items-center justify-center gap-2 ${
                isRunning
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
              className={`flex items-center gap-2 text-xs font-medium rounded-md px-3 py-2 border ${
                status === "success"
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
        </div>
      </div>
    </div>
  );
}

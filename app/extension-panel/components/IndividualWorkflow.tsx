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
          className="p-1.5 -ml-1.5 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated rounded-md transition-colors cursor-pointer outline-none"
          aria-label="Back to workflows list"
        >
          <ArrowLeft size={16} />
        </button>
        
        {/* Logo/Icon beside Title */}
        <div className="w-6 h-6 rounded-md bg-app-surface-elevated border border-app-border-default/20 flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-3.5 h-3.5 object-contain" />
          ) : (
            <WorkflowIcon size={11} className="text-brand-primary" />
          )}
        </div>

        <h2 className="text-xs font-semibold text-app-text-primary truncate pr-2 flex-1">
          {w.title}
        </h2>
      </div>

      {w.description && (
        <p className="text-[11px] text-app-text-muted -mt-2 leading-relaxed">{w.description}</p>
      )}

      {/* Form Content */}
      <div className="bg-app-surface rounded-xl border border-app-border-default/20 overflow-hidden shadow-xs">
        <div className="p-4 space-y-4">
          <div className="flex bg-app-canvas rounded-full p-1 gap-1 border border-app-border-default/10">
            <button
              onClick={() => setWorkflowTab("variables")}
              className={`flex-1 text-[10px] py-1.5 font-medium rounded-full transition flex items-center justify-center gap-2 cursor-pointer ${
                workflowTab === "variables"
                  ? "bg-app-surface-elevated text-app-text-primary shadow-xs"
                  : "text-app-text-muted hover:text-app-text-primary"
              }`}
            >
              Variables
              {inputCount > 0 && (
                <span
                  className={`text-[9px] rounded-full px-1.5 leading-4 ${
                    workflowTab === "variables"
                      ? "bg-brand-primary/10 text-brand-primary"
                      : "bg-app-surface text-app-text-ghost"
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
                  ? "bg-app-surface-elevated text-app-text-primary shadow-xs"
                  : "text-app-text-muted hover:text-app-text-primary"
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
                      <label className="text-[11px] text-app-text-secondary font-medium flex items-center gap-1">
                        {inputSchema.label || inputSchema.name}
                        {inputSchema.required && (
                          <span className="text-app-danger-strong font-bold" aria-hidden="true">
                            *
                          </span>
                        )}
                      </label>

                      {inputSchema.type === "largetext" ? (
                        <textarea
                          className={`w-full bg-app-canvas border rounded-lg p-2.5 text-xs text-app-text-primary resize-none outline-none transition focus:ring-0 ${
                            isMissing
                              ? "border-app-danger-strong/50 focus:border-app-danger-strong"
                              : "border-app-border-default/20 focus:border-brand-primary"
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
                          className={`w-full bg-app-canvas border rounded-full p-2.5 text-xs text-app-text-primary outline-none transition focus:ring-0 ${
                            isMissing
                              ? "border-app-danger-strong/50 focus:border-app-danger-strong"
                              : "border-app-border-default/20 focus:border-brand-primary"
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
                        <label className="flex items-center gap-2 text-xs text-app-text-secondary cursor-pointer w-fit mt-1">
                          <input
                            type="checkbox"
                            className="accent-brand-primary rounded bg-app-canvas border-app-border-default/20 w-4 h-4 cursor-pointer"
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
                            <div className="flex items-center justify-between gap-2 bg-app-canvas border border-app-border-default/20 rounded-md px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip size={14} className="text-app-text-ghost shrink-0" />
                                <span className="text-xs text-app-text-secondary truncate font-medium">
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
                                className="p-1 text-app-text-muted hover:text-app-danger-strong transition cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <input
                              type="file"
                              className={`block w-full text-xs text-app-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-app-surface-elevated file:text-app-text-primary hover:file:bg-app-surface-hover cursor-pointer ${
                                isMissing ? "ring-1 ring-app-danger-strong/30 rounded-md" : ""
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
                          className={`w-full bg-app-canvas border rounded-full px-4 py-2.5 text-xs text-app-text-primary outline-none transition focus:ring-0 ${
                            isMissing
                              ? "border-app-danger-strong/50 focus:border-app-danger-strong"
                              : "border-app-border-default/20 focus:border-brand-primary"
                          }`}
                          value={val}
                          onBlur={() =>
                            setTouchedFields((p) => ({ ...p, [fieldKey]: true }))
                          }
                          onChange={(e) => updateField(inputSchema.name, e.target.value)}
                        />
                      )}

                      {isMissing && (
                        <span className="text-[10px] text-app-danger-strong font-medium">
                          This field is required
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div className="text-[10px] text-app-text-ghost font-mono mb-1.5 tracking-wider uppercase">
                  Inputs (JSON)
                </div>
                <textarea
                  className="w-full bg-app-canvas border border-app-border-default/20 rounded-xl p-3 text-xs font-mono text-app-text-primary resize-none h-24 outline-none transition focus:border-brand-primary"
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
            <div className="relative bg-app-canvas border border-app-border-default/10 rounded-xl p-3">
              <button
                onClick={(e) => handleCopyScript(e, w._id, w.script)}
                aria-label="Copy script"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-app-surface hover:bg-app-surface-hover text-app-text-muted hover:text-app-text-primary transition flex items-center gap-1.5 text-[10px] cursor-pointer outline-none"
              >
                {copiedScript === w._id ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
              <pre className="text-[10px] text-app-text-secondary overflow-x-auto font-mono leading-relaxed max-h-60 overflow-y-auto pr-8">
                {w.script}
              </pre>
            </div>
          )}

          {missingRequired.length > 0 && workflowTab === "script" && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-primary bg-app-danger-soft/10 border border-app-danger-soft/20 p-2.5 rounded-md">
              <AlertCircle size={14} className="text-app-danger-strong" />
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
              className={`w-full py-2.5 rounded-full cursor-pointer text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 ${
                isRunning
                  ? "bg-brand-primary/50 text-white/70 cursor-not-allowed shadow-none"
                  : "bg-brand-primary hover:bg-brand-primary/95 text-white active:scale-[0.98]"
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
                  ? "text-emerald-600 bg-emerald-500/5 border-emerald-500/20"
                  : "text-app-danger-strong bg-app-danger-soft/5 border-app-danger-soft/20"
              }`}
            >
              {status === "success" ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Workflow ran successfully</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-app-danger-strong" />
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

import { Play, Copy, Check } from "lucide-react";
import { useState } from "react";

export function WorkflowsTab({
  activeTab,
  workflows,
  expandedWorkflow,
  setExpandedWorkflow,
  workflowInputs,
  setWorkflowInputs,
  runWorkflow
}: any) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  return (
    <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${activeTab === "workflows" ? "block" : "hidden"}`}>
      {workflows.length === 0 ? (
        <div className="text-center text-xs text-gray-500 mt-10">No workflows found.</div>
      ) : (
        workflows.map((w: any) => (
          <div key={w._id} className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-md">
            <div
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 transition"
              onClick={() => setExpandedWorkflow(expandedWorkflow === w._id ? null : w._id)}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-200">{w.title}</h3>
                {w.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{w.description}</p>}
              </div>
              <button
                onClick={(e) => handleCopyId(e, w._id)}
                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-md transition cursor-pointer flex items-center gap-1 text-[10px]"
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
            </div>

            {expandedWorkflow === w._id && (
              <div className="p-3 border-t border-white/5 bg-black/20 space-y-3">
                {w.inputs && Array.isArray(w.inputs) && w.inputs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase">Workflow Inputs</div>
                    {w.inputs.map((inputSchema: any, idx: number) => {
                      const val = (workflowInputs[w._id] || {})[inputSchema.name] || '';
                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <label className="text-xs text-gray-300 font-medium">
                            {inputSchema.label || inputSchema.name}
                          </label>
                          {inputSchema.type === 'largetext' ? (
                            <textarea
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs text-gray-300 resize-none outline-none focus:border-blue-500/50"
                              rows={3}
                              value={val}
                              onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.value } })}
                            />
                          ) : inputSchema.type === 'select' ? (
                            <select
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs text-gray-300 outline-none focus:border-blue-500/50"
                              value={val}
                              onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.value } })}
                            >
                              <option value="">Select an option...</option>
                              {(inputSchema.options || []).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : inputSchema.type === 'boolean' ? (
                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-blue-600 rounded bg-[#0a0a0a] border-white/10"
                                checked={!!val}
                                onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.checked } })}
                              />
                              <span>Enable {inputSchema.label || inputSchema.name}</span>
                            </label>
                          ) : (
                            <input
                              type="text"
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs text-gray-300 outline-none focus:border-blue-500/50"
                              value={val}
                              onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: { ...workflowInputs[w._id], [inputSchema.name]: e.target.value } })}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] text-gray-500 font-mono mb-1">INPUTS (JSON)</div>
                    <textarea
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-xs font-mono text-gray-300 resize-none h-16 outline-none focus:border-blue-500/50"
                      placeholder={'{"url": "https://..."}'}
                      value={typeof workflowInputs[w._id] === 'string' ? workflowInputs[w._id] : ''}
                      onChange={(e) => setWorkflowInputs({ ...workflowInputs, [w._id]: e.target.value })}
                    />
                  </div>
                )}
                <button
                  onClick={() => runWorkflow(w)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2"
                >
                  <Play size={12} fill="currentColor" />
                  Execute Workflow
                </button>
                <div className="bg-black/40 border border-white/5 rounded-md p-2">
                  <div className="text-[10px] text-gray-500 font-mono mb-1">SCRIPT</div>
                  <pre className="text-[10px] text-gray-300 overflow-x-auto font-mono leading-relaxed">{w.script}</pre>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

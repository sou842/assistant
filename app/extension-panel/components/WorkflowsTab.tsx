import {
  Copy,
  Check,
  ChevronRight,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useState } from "react";
import { IndividualWorkflow } from "./IndividualWorkflow";
import companiesData from "./lib/companies.json";

// Precompile company matchers at module scope to avoid re-compilation on every render/loop
const companyMatchList = Object.values(companiesData as Record<string, any>)
  .map((c) => {
    const matchers: RegExp[] = [];
    if (c.domain) {
      matchers.push(new RegExp(`\\b${c.domain.replace(/\./g, "\\.")}\\b`, "i"));
    }
    if (c.name && c.name.length >= 4) {
      // Escape regex special chars in company name
      const escapedName = c.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      matchers.push(new RegExp(`\\b${escapedName}\\b`, "i"));
    }
    return {
      logo: c.logo,
      matchers,
    };
  })
  .filter((c) => c.matchers.length > 0);

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

  const getWorkflowLogo = (w: any) => {
    if (!w) return null;
    
    const titleLower = (w.title || "").toLowerCase();
    const descLower = (w.description || "").toLowerCase();

    // 1. Fast path: Check title and description first (short text)
    for (const company of companyMatchList) {
      const isMatch = company.matchers.some(
        (regex) => regex.test(titleLower) || regex.test(descLower)
      );
      if (isMatch) return company.logo;
    }

    // 2. Slow path: Check the larger script body only if title/desc don't match
    const scriptLower = (w.script || "").toLowerCase();
    for (const company of companyMatchList) {
      const isMatch = company.matchers.some((regex) => regex.test(scriptLower));
      if (isMatch) return company.logo;
    }
    
    return null;
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeWorkflowData = expandedWorkflow
    ? workflows?.find((w: any) => w._id === expandedWorkflow)
    : null;

  return (
    <div
      className={`flex-1 overflow-y-auto p-3 space-y-3 ${
        activeTab === "workflows" ? "block" : "hidden"
      }`}
    >
      {workflows?.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
          <div className="w-10 h-10 rounded-full bg-app-surface-elevated flex items-center justify-center mb-3">
            <WorkflowIcon size={16} className="text-app-text-secondary" />
          </div>
          <p className="text-xs font-semibold text-app-text-primary">No workflows yet</p>
          <p className="text-[11px] text-app-text-muted mt-1 max-w-[220px] leading-relaxed">
            Workflows you create will show up here, ready to configure and run.
          </p>
        </div>
      ) : activeWorkflowData ? (
        // --- DETAIL VIEW (Single Workflow Component) ---
        <IndividualWorkflow
          w={activeWorkflowData}
          logoUrl={getWorkflowLogo(activeWorkflowData)}
          onBack={() => setExpandedWorkflow(null)}
          workflowInputs={workflowInputs}
          setWorkflowInputs={setWorkflowInputs}
          runWorkflow={runWorkflow}
        />
      ) : (
        // --- LIST VIEW (Master) ---
        <div className="space-y-2 pb-8 animate-in slide-in-from-left-4 duration-300 fade-in">
          {workflows?.map((w: any) => {
            const inputCount = w.inputs?.length || 0;
            return (
              <div
                key={w._id}
                className="bg-app-surface border border-transparent shadow-xs hover:shadow-sm hover:bg-app-surface-hover rounded-xl overflow-hidden transition-all duration-200 group"
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
                  className="relative p-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-app-surface-elevated/20 transition duration-200"
                >
                  {/* Middle: Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-xs font-semibold text-app-text-primary truncate group-hover:text-brand-primary transition-colors duration-200">
                      {w.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 border ${
                        inputCount > 0
                          ? "bg-app-surface-elevated text-app-text-muted border-app-border-default/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
                      }`}>
                        {inputCount > 0 ? `${inputCount} variable${inputCount > 1 ? 's' : ''}` : 'ready to run'}
                      </span>
                      {w.description && (
                        <p className="text-[10px] text-app-text-ghost truncate">
                          {w.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleCopyId(e, w._id)}
                      aria-label="Copy workflow ID"
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-app-surface-elevated text-app-text-muted hover:text-app-text-primary rounded-md transition cursor-pointer flex items-center gap-1.5 text-[10px] outline-none"
                      title="Copy Workflow ID"
                    >
                      {copiedId === w._id ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <ChevronRight
                      size={14}
                      className="text-app-text-ghost group-hover:text-app-text-muted transition-colors duration-200"
                    />
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
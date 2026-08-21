"use client";

import React from "react";
import useSWR from "swr";
import {
  Cpu,
  Trash2,
  Search,
  X,
  Calendar,
  AlertCircle,
  ChevronRight,
  Terminal,
  BrainCog
} from "lucide-react";
import { PageHeader } from "../_components/page-header";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAI } from "../_components/ai-provider";

interface Workflow {
  _id: string;
  title: string;
  description: string;
  script: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const router = useRouter();

  const { data: result, isLoading, mutate } = useSWR("/api/workflows", fetcher);
  const workflows = React.useMemo(() => result?.data || [], [result]);

  const filteredWorkflows = React.useMemo(() => {
    if (!searchQuery.trim()) return workflows;
    const q = searchQuery.toLowerCase();
    return workflows.filter((w: Workflow) =>
      w.title.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q)
    );
  }, [workflows, searchQuery]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workflow?")) return;

    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Workflow deleted successfully");
        mutate();
      } else {
        toast.error(data.error || "Failed to delete workflow");
      }
    } catch (err) {
      toast.error("Failed to delete workflow");
    }
  };

  return (
    <div className="min-h-screen bg-app-canvas text-app-text-primary">
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          icon={<BrainCog className="text-brand-primary" />}
          title="AI Workflows"
        >
          {/* Controls in Header */}
          <div className="flex items-center gap-2.5 max-w-sm w-full bg-app-surface-glass border border-app-border-default rounded-full px-3 py-1.5 shadow-sm">
            <Search className="size-3.5 text-app-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-app-text-primary placeholder:text-app-text-muted/60 w-full focus:ring-0 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-app-text-muted hover:text-app-text-primary outline-none">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </PageHeader>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {/* Workflow List */}
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-app-surface border border-app-border-subtle animate-pulse p-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="size-8 bg-app-surface-glass rounded-lg animate-pulse" />
                    <div className="space-y-1.5 flex-1 max-w-md">
                      <div className="h-4 bg-app-surface-glass rounded w-1/3 animate-pulse" />
                      <div className="h-3 bg-app-surface-glass rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 bg-app-surface-glass rounded w-24 animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-app-surface-glass border border-app-border-subtle rounded-2xl max-w-2xl mx-auto space-y-4">
              <div className="size-12 rounded-full bg-app-surface-elevated border border-app-border-default flex items-center justify-center text-app-text-muted">
                <AlertCircle className="size-6 text-app-text-secondary" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight">No workflows found</h3>
                <p className="text-sm text-app-text-muted mt-1 leading-relaxed">
                  Ask Jarvis in the chat to create a workflow for you (e.g. "Create a workflow to like a YouTube video").
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-app-surface-glass-soft border border-app-border-subtle rounded-2xl overflow-hidden backdrop-blur-md">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-app-surface-glass border-b border-app-border-subtle text-[10px] font-bold uppercase tracking-wider text-app-text-soft">
                <div className="col-span-5">Workflow</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-right pr-8">Created</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-app-border-subtle">
                {filteredWorkflows.map((workflow: Workflow) => (
                  <div
                    key={workflow._id}
                    onClick={() => router.push(`/ai/workflows/${workflow._id}`)}
                    className="group relative grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 items-center hover:bg-app-surface-glass transition-all duration-200 cursor-pointer"
                  >
                    {/* Workflow Info (Title & Icon) */}
                    <div className="col-span-1 md:col-span-5 flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary relative overflow-hidden group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                        <BrainCog className="size-4.5 relative z-10" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-normal text-app-text-primary text-sm truncate transition-colors duration-200 tracking-tight">
                          {workflow.title}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="col-span-1 md:col-span-5 text-xs text-app-text-muted line-clamp-1 pr-4">
                      {workflow.description || "No description provided."}
                    </div>

                    {/* Created Date & Actions */}
                    <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-4">
                      <span className="flex items-center gap-1.5 text-xs text-app-text-soft md:pr-4">
                        <Calendar className="size-3.5 md:hidden" />
                        {new Date(workflow.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDelete(workflow._id, e)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-app-text-muted hover:text-app-danger-strong hover:bg-app-danger-soft rounded-lg transition-all duration-200 cursor-pointer outline-none shrink-0 border border-transparent hover:border-app-danger-border"
                          title="Delete workflow"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <ChevronRight className="size-4 text-app-text-soft group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

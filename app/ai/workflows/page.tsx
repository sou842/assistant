"use client";

import React from "react";
import useSWR from "swr";
import {
  Cpu,
  Trash2,
  Code,
  Search,
  X,
  FileCode,
  Calendar,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "../_components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
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
  const { setSidebarOpen } = useAI();

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

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
          icon={<Cpu className="text-brand-primary" />}
          title="AI Workflows"
        />

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-3 max-w-md bg-app-surface shadow-xs border border-transparent rounded-full px-4 py-2">
            <Search className="size-4 text-app-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-app-text-primary placeholder:text-app-text-ghost w-full focus:ring-0 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-app-text-muted hover:text-app-text-primary outline-none">
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Workflow List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-app-surface border border-transparent animate-pulse p-5 space-y-3 shadow-xs">
                  <div className="h-6 bg-app-surface-elevated rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-app-surface-elevated rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-app-surface-elevated rounded w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-app-surface border border-transparent shadow-xs rounded-2xl max-w-2xl mx-auto space-y-4">
              <div className="size-12 rounded-full bg-app-surface-elevated flex items-center justify-center text-app-text-muted">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkflows.map((workflow: Workflow) => (
                <div
                  key={workflow._id}
                  onClick={() => router.push(`/ai/workflows/${workflow._id}`)}
                  className="group relative rounded-2xl bg-app-surface border border-transparent p-5 hover:bg-app-surface-hover cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 shadow-xs hover:shadow-sm hover:scale-[1.01]"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-app-text-primary text-base truncate pr-6 group-hover:text-brand-primary transition-colors tracking-tight">
                        {workflow.title}
                      </h3>
                      <button
                        onClick={(e) => handleDelete(workflow._id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-app-text-muted hover:text-app-danger-strong hover:bg-app-danger-soft rounded-full transition-all absolute right-4 top-4 z-10 cursor-pointer outline-none"
                        title="Delete workflow"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="text-xs text-app-text-muted line-clamp-3 leading-relaxed">
                      {workflow.description || "No description provided."}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-app-text-ghost pt-2 border-t border-app-border-default/10">
                    <span className="flex items-center gap-1">
                      <Code className="size-3.5" />
                      JS Code
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {new Date(workflow.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

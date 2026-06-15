"use client";

import React, { use, useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Loader2, AlertCircle, Bot, Forward } from "lucide-react";
import { PageHeader } from "../../_components/page-header";
import FlowCanvas from "@/components/playground/FlowCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Node, Edge } from "@xyflow/react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScheduleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: result, isLoading, mutate } = useSWR(`/api/schedule/tasks/${id}`, fetcher);
  const task = result?.data;
  
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [isGlobalGenerating, setIsGlobalGenerating] = useState(false);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!task?.steps || task.steps.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    task.steps.forEach((step: any, index: number) => {
      // Create a node for each step
      const nodeId = `node_${step.id || index}`;
      nodes.push({
        id: nodeId,
        type: "customTool",
        position: { x: 300, y: 100 + index * 200 }, // Layout vertically
        data: {
          toolId: step.type,
          config: step.config || {},
          state: { status: "idle" },
          condition: step.condition, // Store condition if needed
        },
      });

      // Connect to the previous node
      if (index > 0) {
        const prevNodeId = `node_${task.steps[index - 1].id || index - 1}`;
        edges.push({
          id: `edge_${prevNodeId}_${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          animated: true,
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [task]);

  const handleSaveNodeConfig = async (nodeId: string, newConfig: any) => {
    if (!task) return;
    const updatedSteps = [...task.steps];
    
    // Find step index. Node ids are 'node_{step.id || index}'
    const index = updatedSteps.findIndex((s: any, i: number) => `node_${s.id || i}` === nodeId);
    if (index >= 0) {
      updatedSteps[index].config = newConfig;
      
      try {
        const res = await fetch(`/api/schedule/tasks/${task._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: updatedSteps })
        });
        const json = await res.json();
        if (json.success) {
          toast.success("Schedule configuration saved");
        } else {
          toast.error("Failed to save schedule configuration");
        }
      } catch (err) {
        toast.error("Error saving schedule configuration");
      }
    }
  };

  const handleGlobalAI = async () => {
    if (!globalPrompt.trim() || !task) return;
    
    setIsGlobalGenerating(true);
    try {
      const res = await fetch("/api/workflow/ai-global-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: globalPrompt,
          currentSteps: task.steps
        })
      });
      
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to generate global config");
        return;
      }

      // Save the updated steps back to the DB
      const saveRes = await fetch(`/api/schedule/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: json.steps })
      });
      
      const saveJson = await saveRes.json();
      if (saveJson.success) {
        toast.success("Workflow globally updated by AI");
        setGlobalPrompt("");
        mutate(); // Refresh the page data
      } else {
        toast.error("Failed to save global changes");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsGlobalGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-app-canvas">
        <Loader2 className="size-8 animate-spin text-app-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-app-canvas gap-4">
        <AlertCircle className="size-12 text-app-text-ghost" />
        <h2 className="text-lg font-semibold text-app-text-primary">Task not found</h2>
        <Link href="/ai/schedule">
          <Button variant="outline">Back to Schedule</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-app-canvas overflow-hidden">
      <PageHeader
        icon={<Calendar />}
        backHref="/ai/schedule"
        title={task.title}
        subtitle={task.scheduleType === "one_time" ? "One-time Execution" : `Recurring every ${task.intervalMinutes} minutes`}
      >
        <div className="flex items-center gap-3 ml-auto">
          <Badge
            className={cn(
              "capitalize rounded-full px-3",
              task.status === "active" && "bg-emerald-500/15 text-emerald-300",
              task.status === "paused" && "bg-amber-500/15 text-amber-300",
              task.status === "failed" && "bg-red-500/15 text-red-300",
              task.status === "completed" && "bg-blue-500/15 text-blue-300"
            )}
          >
            {task.status}
          </Badge>
        </div>
      </PageHeader>

      {/* Task Metadata Bar */}
      {/* <div className="bg-app-surface-glass border-b border-app-border-subtle p-3 flex items-center justify-center gap-8 text-sm z-10 relative">
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-app-text-faint font-semibold">ID</span>
          <span className="font-mono text-app-text-soft">{task._id}</span>
        </div>
        <div className="h-6 w-px bg-app-border-subtle"></div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-app-text-faint font-semibold">Timezone</span>
          <span className="text-app-text-soft">{task.timezone || "Default"}</span>
        </div>
        <div className="h-6 w-px bg-app-border-subtle"></div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-app-text-faint font-semibold">Next Run</span>
          <span className="text-app-text-soft">{task.nextRunAt ? format(new Date(task.nextRunAt), "PPpp") : "Not scheduled"}</span>
        </div>
        <div className="h-6 w-px bg-app-border-subtle"></div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-app-text-faint font-semibold">Last Run</span>
          <span className="text-app-text-soft">{task.lastRunAt ? format(new Date(task.lastRunAt), "PPpp") : "Never"}</span>
        </div>
      </div> */}

      {task.lastError && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex flex-col items-center justify-center gap-1 z-10 relative">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Execution Error</span>
          </div>
          <pre className="text-[10px] font-mono text-red-300 max-w-4xl text-center truncate">{task.lastError}</pre>
        </div>
      )}

      {/* FlowCanvas Area */}
      <div className="flex-1 relative">
        <FlowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          readOnly={true}
          onSaveNodeConfig={handleSaveNodeConfig}
        />

        {/* Global AI Assistant Floating Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
          <div className="bg-background/80 backdrop-blur-xl border border-primary/20 p-2 pl-1.5 rounded-full shadow-2xl flex items-center gap-3 relative overflow-hidden transition-all focus-within:border-primary/50 focus-within:shadow-primary/20 focus-within:ring-4 focus-within:ring-primary/10">
            <div className="flex items-center justify-center bg-primary/10 w-10 h-10 rounded-full ml-1 shrink-0">
              <Bot className="size-5 text-primary" />
            </div>
            <input
              type="text"
              placeholder="Ask AI to modify the overall workflow"
              className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 h-10"
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGlobalAI();
              }}
              disabled={isGlobalGenerating}
            />
            <Button
              onClick={handleGlobalAI}
              disabled={isGlobalGenerating || !globalPrompt.trim()}
              className="shrink-0 rounded-full p-2 h-9 w-9"
            >
              {isGlobalGenerating ? <Loader2 className="size-4 animate-spin" /> : <Forward className="size-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

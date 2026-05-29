"use client";

import React from "react";
import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import { Bot, Calendar, CalendarDays, Menu, Pause, Play, Plus, Trash2, Zap } from "lucide-react";
import { useAI } from "../_components/ai-provider";
import { PageHeader } from "../_components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SchedulePage() {
  const { setMobileSidebarOpen } = useAI();
  const [prompt, setPrompt] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const { data: result, isLoading } = useSWR("/api/schedule/tasks", fetcher);
  const tasks = React.useMemo(() => result?.data || [], [result]);

  const refresh = () => mutate("/api/schedule/tasks");

  const createFromAI = async () => {
    if (!prompt.trim()) return;

    setIsCreating(true);
    try {
      const parsedRes = await fetch("/api/schedule/ai-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const parsed = await parsedRes.json();

      if (!parsed.success) {
        toast.error(parsed.error || "AI parse failed");
        return;
      }

      const createRes = await fetch("/api/schedule/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const created = await createRes.json();

      if (!created.success) {
        toast.error(created.error || "Task creation failed");
        return;
      }

      toast.success("Scheduled task created");
      setPrompt("");
      refresh();
    } catch (error) {
      toast.error("Failed to create scheduled task");
    } finally {
      setIsCreating(false);
    }
  };

  const updateTask = async (id: string, payload: any) => {
    const res = await fetch(`/api/schedule/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Update failed");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this schedule task?")) return;
    try {
      await fetch(`/api/schedule/tasks/${id}`, { method: "DELETE" });
      refresh();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch(`/api/schedule/tasks/${id}/run`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Run failed");
        return;
      }
      toast.success("Task executed");
      refresh();
    } catch {
      toast.error("Run failed");
    }
  };

  const togglePause = async (task: any) => {
    try {
      await updateTask(task._id, { status: task.status === "paused" ? "active" : "paused" });
      refresh();
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <div className="flex h-screen relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 relative">
        <PageHeader
          icon={<Calendar />}
          title="Schedule"
          subtitle="Manage recurring and one-time automations"
          actions={
            <Link href="/ai/schedule/calendar">
              <Button variant="outline" className="rounded-full border-app-border-strong text-app-text-soft hover:bg-app-surface-glass hover:text-app-text-primary">
                <CalendarDays className="size-4" />
                Calendar View
              </Button>
            </Link>
          }
        />

        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
            <div className="rounded-2xl border border-app-border-default bg-app-surface-glass p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-3">
                <Bot className="mt-0.5 size-5 text-app-text-soft" />
                <div>
                  <h2 className="text-sm font-medium text-app-text-primary">Create with AI</h2>
                  <p className="text-xs text-app-text-faint">Example: send weather every hour to +91..., remind me tomorrow 9am.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Create a schedule task..."
                  className="rounded-full border-app-border-default bg-app-surface-glass pl-4"
                />
                <Button onClick={createFromAI} disabled={isCreating} className="rounded-full bg-app-primary text-app-primary-foreground hover:bg-app-primary-hover">
                  <Plus className="size-4" />
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-app-border-default bg-app-surface-glass-soft">
              <div className="grid grid-cols-12 gap-2 border-b border-app-border-default px-4 py-3 text-xs text-app-text-faint">
                <div className="col-span-4">Task</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Next Run</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {isLoading ? (
                <div className="p-6 text-sm text-app-text-ghost">Loading schedule tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="p-6 text-sm text-app-text-ghost">No schedule tasks yet.</div>
              ) : (
                tasks.map((task: any) => (
                  <div key={task._id} className="grid grid-cols-12 items-center gap-2 border-b border-app-border-subtle px-4 py-3">
                    <div className="col-span-4 min-w-0">
                      <p className="truncate text-sm text-app-text-primary">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {task.steps?.map((step: any, idx: number) => (
                          <React.Fragment key={step.id}>
                            <Badge variant="outline" className="text-[10px] h-5 rounded bg-app-surface-glass border-app-border-subtle text-app-text-soft">
                              {step.type}
                            </Badge>
                            {idx < task.steps.length - 1 && <span className="text-app-text-ghost text-[10px]">&rarr;</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-app-text-soft">{task.scheduleType === "one_time" ? "One-time" : `Every ${task.intervalMinutes || "?"} min`}</div>
                    <div className="col-span-2 text-xs text-app-text-soft">{task.nextRunAt ? format(new Date(task.nextRunAt), "MMM d, HH:mm") : "-"}</div>
                    <div className="col-span-1">
                      <Badge
                        className={cn(
                          "capitalize rounded-full",
                          task.status === "active" && "bg-emerald-500/15 text-emerald-300",
                          task.status === "paused" && "bg-amber-500/15 text-amber-300",
                          task.status === "failed" && "bg-red-500/15 text-red-300",
                          task.status === "completed" && "bg-blue-500/15 text-blue-300"
                        )}
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-8 rounded-full border-app-border-strong hover:bg-app-surface-glass" onClick={() => handleRunNow(task._id)}>
                        <Zap className="size-3.5" /> Run
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-full border-app-border-strong hover:bg-app-surface-glass" onClick={() => togglePause(task)}>
                        {task.status === "paused" ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-full border-red-400/30 text-red-300" onClick={() => handleDelete(task._id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

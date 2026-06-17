"use client";

import React from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { 
  Bot, 
  Calendar, 
  CalendarDays, 
  Pause, 
  Play, 
  Plus, 
  Trash2, 
  Zap, 
  AlertCircle, 
  Loader2,
  ArrowRight
} from "lucide-react";
import { PageHeader } from "../_components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { TooltipContent, Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { scheduleTemplates } from "@/lib/schedule-templates";
import { useRouter } from "next/navigation";

// --- Types ---
interface Step {
  id: string;
  type: string;
}

interface Task {
  _id: string;
  title: string;
  status: "active" | "paused" | "failed" | "completed";
  scheduleType: "one_time" | "recurring";
  intervalMinutes?: number;
  nextRunAt?: string;
  lastError?: string;
  steps?: Step[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SchedulePage() {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [runningTasks, setRunningTasks] = React.useState<Set<string>>(new Set());
  const [togglingTasks, setTogglingTasks] = React.useState<Set<string>>(new Set());

  // Use the bound mutate function for cleaner cache invalidation
  const { data: result, isLoading, mutate: refresh } = useSWR<ApiResponse<Task[]>>("/api/schedule/tasks", fetcher);
  const tasks = React.useMemo(() => result?.data || [], [result]);

  const filteredTasks = React.useMemo(() => {
    if (!prompt.trim()) return tasks;
    const lowerPrompt = prompt.toLowerCase();
    return tasks.filter((task) => 
      task.title.toLowerCase().includes(lowerPrompt) || 
      task.steps?.some((step) => step.type.toLowerCase().includes(lowerPrompt))
    );
  }, [tasks, prompt]);

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
      await refresh();
    } catch (error) {
      console.error("Task creation error:", error);
      toast.error("Failed to create scheduled task");
    } finally {
      setIsCreating(false);
    }
  };

  const updateTask = async (id: string, payload: Partial<Task>) => {
    const res = await fetch(`/api/schedule/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Update failed");
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this schedule task?")) return;
    
    try {
      await fetch(`/api/schedule/tasks/${id}`, { method: "DELETE" });
      await refresh();
      toast.success("Task deleted");
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error("Delete failed");
    }
  };

  const handleRunNow = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRunningTasks((prev) => new Set(prev).add(id));
    
    try {
      const res = await fetch(`/api/schedule/tasks/${id}/run`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Run failed");
        return;
      }
      toast.success("Task executed");
      await refresh();
    } catch (error) {
      console.error("Run task error:", error);
      toast.error("Run failed");
    } finally {
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const togglePause = async (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingTasks((prev) => new Set(prev).add(task._id));
    
    try {
      await updateTask(task._id, { status: task.status === "paused" ? "active" : "paused" });
      await refresh();
    } catch (error) {
      console.error("Toggle pause error:", error);
      toast.error("Action failed");
    } finally {
      setTogglingTasks((prev) => {
        const next = new Set(prev);
        next.delete(task._id);
        return next;
      });
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/ai/schedule/${id}`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(id);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen relative overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <PageHeader
            icon={<Calendar />}
            title="Schedule"
            subtitle="Manage recurring and one-time automations"
            actions={
              <div className="flex items-center gap-2">
                <Link href="/ai/schedule/calendar">
                  <Button variant="outline" className="rounded-full border-app-border-default text-app-text-soft hover:bg-app-surface-glass hover:text-app-text-primary">
                    <CalendarDays className="size-4 mr-2" />
                    Calendar View
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
              
              {/* Create with AI Section */}
              <div className="rounded-2xl border border-app-border-default bg-app-surface-glass p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Bot className="mt-0.5 size-5 text-app-text-soft" />
                  <h2 className="text-sm font-medium text-app-text-primary">Create with AI</h2>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Search or create a schedule task..."
                    className="rounded-full border-app-border-default bg-app-surface-glass pl-4"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createFromAI();
                    }}
                  />
                  <Button onClick={createFromAI} disabled={isCreating} className="rounded-full bg-app-primary text-app-primary-foreground hover:bg-app-primary-hover">
                    {isCreating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>

              {/* Quick Templates Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-app-text-primary">
                    <h2 className="text-sm font-medium">Quick Templates</h2>
                  </div>
                  <Link href="/ai/schedule/templates" className="text-sm text-app-text-soft hover:text-brand-primary flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scheduleTemplates.slice(0, 3).map((tpl) => (
                    <Link href={`/ai/schedule/templates?templateId=${tpl.id}`} key={tpl.id} className="block h-full">
                      <div className="group relative overflow-hidden rounded-xl border border-app-border-default bg-app-surface-glass-soft p-4 hover:border-brand-primary/40 hover:bg-app-surface-glass transition-all h-full flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-app-text-primary group-hover:text-brand-primary transition-colors">{tpl.title}</h3>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-surface-glass border border-app-border-subtle group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 transition-colors">
                              <ArrowRight className="size-3 text-app-text-ghost group-hover:text-brand-primary transition-colors -rotate-45 group-hover:rotate-0 duration-300" />
                            </div>
                          </div>
                          <p className="text-xs text-app-text-soft flex-1 leading-relaxed">{tpl.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Tasks Table */}
              <div className="overflow-hidden rounded-2xl border border-app-border-default bg-app-surface-glass-soft">
                <div className="grid grid-cols-12 gap-2 border-b border-app-border-default px-4 py-3 text-xs text-app-text-faint">
                  <div className="col-span-4">Task</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Next Run</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {isLoading ? (
                  <div className="p-6 text-sm text-app-text-ghost flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Loading schedule tasks...
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="p-6 text-sm text-app-text-ghost">
                    {prompt?.trim() ? "No schedule tasks match your search." : "No schedule tasks yet."}
                  </div>
                ) : (
                  filteredTasks.map((task: Task) => (
                    <div 
                      key={task._id} 
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(task._id)}
                      onKeyDown={(e) => handleRowKeyDown(e, task._id)}
                      className="grid grid-cols-12 items-center gap-2 border-b border-app-border-subtle px-4 py-3 hover:bg-app-surface-glass-strong cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset"
                    >
                      <div className="col-span-4 min-w-0">
                        <p className="truncate text-sm text-app-text-primary">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {task.steps?.map((step: Step, idx: number) => (
                            <React.Fragment key={step.id}>
                              <Badge variant="outline" className="text-[10px] h-5 rounded bg-app-surface-glass border-app-border-subtle text-app-text-soft">
                                {step.type}
                              </Badge>
                              {idx < task.steps!.length - 1 && <span className="text-app-text-ghost text-[10px]">&rarr;</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      
                      <div className="col-span-2 text-xs text-app-text-soft">
                        {task.scheduleType === "one_time" ? "One-time" : `Every ${task.intervalMinutes || "?"} min`}
                      </div>
                      
                      <div className="col-span-2 text-xs text-app-text-soft">
                        {task.nextRunAt ? format(new Date(task.nextRunAt), "MMM d, HH:mm") : "-"}
                      </div>
                      
                      <div className="col-span-1 flex items-center gap-1.5">
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
                        {task.status === "failed" && task.lastError && (
                          <div onClick={(e) => e.stopPropagation()} role="presentation">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="size-4 text-red-400 cursor-help shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded-full" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-red-950 border border-red-800 text-red-100 p-2 rounded shadow-lg">
                                <p className="text-xs font-semibold">Last Error:</p>
                                <p className="text-[11px] font-mono leading-tight">{task.lastError}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>

                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-full border-app-border-strong hover:bg-app-surface-glass min-w-[70px]" 
                          onClick={(e) => handleRunNow(task._id, e)}
                          disabled={runningTasks.has(task._id)}
                          aria-label={`Run ${task.title} now`}
                        >
                          {runningTasks.has(task._id) ? (
                            <>
                              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                              Running
                            </>
                          ) : (
                            <>
                              <Zap className="size-3.5 mr-1.5" /> 
                              Run
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 rounded-full border-app-border-strong hover:bg-app-surface-glass flex items-center justify-center" 
                          onClick={(e) => togglePause(task, e)}
                          disabled={togglingTasks.has(task._id)}
                          aria-label={task.status === "paused" ? "Resume task" : "Pause task"}
                        >
                          {togglingTasks.has(task._id) ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : task.status === "paused" ? (
                            <Play className="size-3.5" />
                          ) : (
                            <Pause className="size-3.5" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-full border-red-400/30 text-red-300 hover:bg-red-400/10 hover:text-red-200" 
                          onClick={(e) => handleDelete(task._id, e)}
                          aria-label="Delete task"
                        >
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
    </TooltipProvider>
  );
}
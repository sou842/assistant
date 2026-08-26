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
      <div className="h-full flex flex-col bg-app-canvas overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PageHeader
            icon={<Calendar className="text-brand-primary" />}
            title="Schedule"
            // subtitle="Manage recurring and one-time automations"
            actions={
              <div className="flex items-center gap-2">
                <Link href="/ai/schedule/calendar">
                  <Button variant="outline" className="rounded-full border-app-border-default/40 text-app-text-secondary hover:bg-app-surface-elevated hover:text-app-text-primary transition-colors">
                    <CalendarDays className="size-4 mr-1.5" />
                    Calendar View
                  </Button>
                </Link>
              </div>
            }
          />

          <div 
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10">
              
              {/* Create with AI Section */}
              <div className="rounded-2xl border border-transparent bg-app-surface shadow-xs p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex size-7 items-center justify-center rounded-full bg-app-surface-elevated">
                    <Bot className="size-4 text-app-text-secondary" />
                  </div>
                  <h2 className="text-sm font-semibold text-app-text-primary tracking-tight">Create with AI</h2>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Search or create a schedule task..."
                    className="rounded-full border-transparent bg-app-surface-elevated px-5 text-sm text-app-text-primary placeholder:text-app-text-ghost focus:border-app-border-default focus:outline-none focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createFromAI();
                    }}
                  />
                  <Button onClick={createFromAI} disabled={isCreating} className="rounded-full bg-brand-primary text-white hover:bg-brand-primary/95 transition-colors font-medium px-5">
                    {isCreating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>

              {/* Quick Templates Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Quick Templates</h2>
                  <Link href="/ai/schedule/templates" className="text-xs font-medium text-brand-primary hover:underline flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scheduleTemplates.slice(0, 3).map((tpl) => (
                    <Link href={`/ai/schedule/templates?templateId=${tpl.id}`} key={tpl.id} className="block h-full">
                      <div className="group relative overflow-hidden rounded-2xl border border-transparent bg-app-surface shadow-xs hover:shadow-sm hover:bg-app-surface-hover p-5 transition-all duration-300 h-full flex flex-col">
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-sm font-semibold text-app-text-primary group-hover:text-brand-primary transition-colors">{tpl.title}</h3>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-surface-elevated border border-transparent group-hover:bg-brand-primary/10 transition-colors">
                              <ArrowRight className="size-3 text-app-text-muted group-hover:text-brand-primary transition-colors -rotate-45 group-hover:rotate-0 duration-300" />
                            </div>
                          </div>
                          <p className="text-xs text-app-text-muted flex-1 leading-relaxed">{tpl.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                <h2 className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Automations</h2>
                
                {isLoading ? (
                  <div className="p-6 text-sm text-app-text-muted flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Loading schedule tasks...
                  </div>
                ) : filteredTasks?.length === 0 ? (
                  <div className="p-8 text-sm text-app-text-muted text-center rounded-2xl bg-app-surface border border-transparent shadow-xs">
                    {prompt?.trim() ? "No schedule tasks match your search." : "No schedule tasks yet."}
                  </div>
                ) : (
                  filteredTasks?.map((task: Task) => (
                    <div 
                      key={task._id} 
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(task._id)}
                      onKeyDown={(e) => handleRowKeyDown(e, task._id)}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-app-surface border border-transparent shadow-xs hover:shadow-sm hover:bg-app-surface-hover px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="text-[14px] font-semibold text-app-text-primary tracking-tight">{task.title}</p>
                          <Badge
                            className={cn(
                              "capitalize rounded-full text-[10px] font-medium border-0 px-2 py-0.5 shadow-none",
                              task.status === "active" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              task.status === "paused" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                              task.status === "failed" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                              task.status === "completed" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            )}
                          >
                            {task.status}
                          </Badge>
                          {task.status === "failed" && task.lastError && (
                            <div onClick={(e) => e.stopPropagation()} role="presentation">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="size-4 text-rose-400 cursor-help shrink-0 outline-none" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-app-surface border border-app-border-default/20 text-app-text-primary p-3 rounded-xl shadow-lg">
                                  <p className="text-xs font-semibold text-rose-500 mb-1">Last Error:</p>
                                  <p className="text-[11px] font-mono leading-relaxed text-app-text-secondary">{task.lastError}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[11px] text-app-text-muted bg-app-surface-elevated/40 px-2.5 py-0.5 rounded-full">
                            {task.scheduleType === "one_time" ? "One-time" : `Every ${task.intervalMinutes || "?"} min`}
                          </span>
                          {task.nextRunAt && (
                            <span className="text-[11px] text-app-text-muted bg-app-surface-elevated/40 px-2.5 py-0.5 rounded-full">
                              Next: {format(new Date(task.nextRunAt), "MMM d, HH:mm")}
                            </span>
                          )}
                          {task.steps && task.steps.length > 0 && (
                            <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                              <span className="text-app-text-ghost text-xs">•</span>
                              {task.steps.map((step: Step, idx: number) => (
                                <React.Fragment key={step.id}>
                                  <span className="text-[10px] text-app-text-muted bg-app-surface-elevated/20 px-2 py-0.5 rounded-md border border-app-border-default/10">
                                    {step.type}
                                  </span>
                                  {idx < task.steps!.length - 1 && <span className="text-app-text-ghost text-[10px]">&rarr;</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-full border-app-border-default/30 hover:bg-app-surface-elevated hover:text-app-text-primary text-app-text-secondary transition-colors font-medium px-4"
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
                              <Zap className="size-3.5 mr-1.5 text-brand-primary" /> 
                              Run
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 rounded-full border-app-border-default/30 hover:bg-app-surface-elevated hover:text-app-text-primary text-app-text-secondary flex items-center justify-center transition-colors" 
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
                          className="h-8 w-8 p-0 rounded-full border-transparent bg-app-danger-soft/10 text-app-danger-strong hover:bg-app-danger-soft hover:text-app-danger-strong flex items-center justify-center transition-colors" 
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
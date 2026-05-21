"use client";

import React from "react";
import { BookOpenCheck, Check, Menu, Plus, X, Bot, Sparkles, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useAI } from "../_components/ai-provider";
import { Button } from "@/components/ui/button";
import { KanbanView } from "./_components/kanban-view";
import { TaskTable } from "./_components/table-view";
import { TaskSidePanel } from "./_components/task-side-panel";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useChat } from "@ai-sdk/react";
import { mistralModels } from "@/components/ai/chat-input";
import { ChatSidePanel } from "./_components/chat-side-panel";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TaskCard } from "./_components/task-card";

import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TasksPage() {
  const { setMobileSidebarOpen } = useAI();
  const [view, setView] = React.useState<"kanban" | "table">("kanban");
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [selectedChatTaskId, setSelectedChatTaskId] = React.useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = React.useState<any | null>(null);

  const { data: result, isLoading: isTasksLoading } = useSWR("/api/tasks", fetcher);
  const tasks = React.useMemo(() => result?.data || [], [result]);

  const selectedTask = React.useMemo(() =>
    tasks.find((t: any) => String(t._id) === selectedTaskId),
    [tasks, selectedTaskId]
  );

  const selectedChatTask = React.useMemo(() =>
    tasks.find((t: any) => String(t._id) === selectedChatTaskId),
    [tasks, selectedChatTaskId]
  );

  const { memories, selectedModel, setSelectedModel } = useAI();
  const [input, setInput] = React.useState("");
  const [showChatBar, setShowChatBar] = React.useState(false);
  const [showResponse, setShowResponse] = React.useState(false);



  const chat = useChat({
    id: "tasks-assistant",
    initialMessages: [],
    onFinish: ({ message }) => {
      // Check if any tool was called (which usually means tasks might have changed)
      const hasToolCalls = (message as any).toolInvocations && (message as any).toolInvocations.length > 0;
      if (hasToolCalls) {
        mutate("/api/tasks");
      }
      setShowResponse(true);
      setShowChatBar(true); // Ensure it's visible when a response arrives
    },
    onError: (err) => {
      console.error("Chat error:", err);
      toast.error("Chat request failed");
    },
  });

  // Keyboard shortcut Cmd+J to toggle
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowChatBar((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { messages, status, regenerate } = chat;
  const sendMessage = (chat as any).sendMessage || (chat as any).append;
  const isChatLoading = status === "submitted" || status === "streaming";

  const selectedModelData = React.useMemo(
    () => mistralModels.find((model) => model.id === selectedModel),
    [selectedModel]
  );

  const sendMessageWithMemory = async (
    payload: any,
    options?: any
  ) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    await sendMessage(payload, {
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, assisting the user with their task manager. You have tools to list, create, update, and delete tasks. Help the user stay organized efficiently. ${selectedChatTask
            ? `\n\nCURRENT CONTEXT: The user is currently focusing on the task: "${selectedChatTask.title}" (ID: ${selectedChatTask._id}). Prioritize actions and responses related to this task.`
            : ""
          }`,
      },
    });
  };

  const regenerateWithMemory = (options?: Parameters<typeof regenerate>[0]) => {
    const enabledMemories = memories
      .filter((m) => m.enabled && m.content.trim())
      .slice(0, 24)
      .map(({ title, content, category, tags }) => ({ title, content, category, tags }));

    regenerate({
      ...options,
      body: {
        ...options?.body,
        memories: enabledMemories,
        systemPrompt: `You are Jarvis, assisting the user with their task manager. You have tools to list, create, update, and delete tasks. Help the user stay organized efficiently. ${selectedChatTask
            ? `\n\nCURRENT CONTEXT: The user is currently focusing on the task: "${selectedChatTask.title}" (ID: ${selectedChatTask._id}). Prioritize actions and responses related to this task.`
            : ""
          }`,
      },
    });
  };

  const handleClearChat = () => {
    chat.setMessages([]);
    setSelectedChatTaskId(null);
  };

  const handleCreateTask = async (data: any) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        mutate("/api/tasks");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleUpdateTask = async (data: any) => {
    if (!selectedTask?._id) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        mutate("/api/tasks");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic UI update
    mutate(
      "/api/tasks",
      (current: any) => {
        if (!current?.data) return current;
        return {
          ...current,
          data: current.data.map((t: any) =>
            String(t._id) === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
          ),
        };
      },
      false
    );

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!result.success) {
        mutate("/api/tasks"); // Rollback on failure
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
      mutate("/api/tasks"); // Rollback on error
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        mutate("/api/tasks");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const openAddPanel = (status?: string) => {
    setSelectedTaskId(status ? `new-${status}` : "new");
    setIsPanelOpen(true);
  };

  const openEditPanel = (task: any) => {
    setSelectedTaskId(String(task._id));
    setIsPanelOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const customCollisionDetection = React.useCallback((args: any) => {
    // First, check if there are any collisions with the chat dropzone or toggle
    const chatCollisions = pointerWithin({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container: any) =>
          container.id === "chat-input-dropzone" ||
          container.id === "chat-toggle-dropzone"
      ),
    });

    if (chatCollisions.length > 0) {
      return chatCollisions;
    }

    // If no chat collision, use closest corners for the rest
    return closestCorners(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t: any) => String(t._id) === active.id);
    setActiveDragTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const task = tasks.find((t: any) => String(t._id) === activeId);
    if (!task) return;

    // Reordering within columns could happen here if we used a single SortableContext,
    // but for status changes, we'll wait for the drop to avoid accidental changes while dragging to chat.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && (over.id === "chat-input-dropzone" || over.id === "chat-toggle-dropzone") && activeDragTask) {
      setSelectedChatTaskId(String(activeDragTask._id));
      setShowChatBar(true);
      toast.success(`Focusing on: ${activeDragTask.title}`);

      // Automatically ask the AI about the task
      setTimeout(() => {
        sendMessageWithMemory({
          role: "user",
          content: `Tell me about the task "${activeDragTask.title}"`
        });
      }, 500);
    } else if (over && activeDragTask) {
      const activeId = active.id;
      const overId = over.id;

      const task = tasks.find((t: any) => String(t._id) === activeId);
      if (!task) return;

      // Check if we are dragging over a column
      const COLUMNS = ["backlog", "todo", "in-progress", "done"];
      const overColumn = COLUMNS.includes(overId as string) ? overId as string : null;

      // Or over another task to get its status
      const overTask = tasks.find((t: any) => String(t._id) === overId);
      const destStatus = overColumn || overTask?.status;

      if (destStatus && task.status !== destStatus) {
        handleStatusChange(String(task._id), destStatus);
      }
    }

    setActiveDragTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen relative overflow-hidden bg-zinc-950">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="w-full h-16 shrink-0 border-b border-white/5 bg-black/70 backdrop-blur-xl z-30">
            <div className="mx-auto max-w-8xl px-5 py-4 h-full">
              <div className="flex items-center justify-between gap-4 h-full">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden size-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white"
                    onClick={() => setMobileSidebarOpen(true)}
                  >
                    <Menu size={16} />
                  </button>

                  <div className="size-9 rounded-xl bg-white/4 border border-white/10 flex items-center justify-center">
                    <BookOpenCheck className="size-4 text-indigo-200" />
                  </div>

                  <div>
                    <h1 className="text-base font-medium tracking-tight text-white">Tasks</h1>
                    <p className="text-xs text-white/35">Manage your upcoming tasks</p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-full p-1">
                  <button
                    onClick={() => setView("kanban")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer",
                      view === "kanban" ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    Kanban
                  </button>
                  <button
                    onClick={() => setView("table")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer",
                      view === "table" ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    Table
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {!showChatBar && <ChatToggleDroppable>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowChatBar(!showChatBar)}
                      className="w-9 h-9 rounded-full transition-all"
                    >
                      {showChatBar ? <X size={14} /> : <Bot size={14} />}
                    </Button>
                  </ChatToggleDroppable>}

                  <Button
                    onClick={() => openAddPanel()}
                    className="h-9 px-4 rounded-full bg-white text-black hover:bg-white/90 transition flex items-center gap-2 text-sm ml-2"
                  >
                    <Plus size={16} />
                    <span>New Task</span>
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
            <div className="mx-auto w-full max-w-8xl px-5 py-12 pb-0">
              {isTasksLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="size-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                  <p className="text-sm text-white/20">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 rounded-3xl border border-white/5 bg-white/2 backdrop-blur-sm text-center">
                  <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <BookOpenCheck className="size-8 text-white/20" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">No tasks yet</h2>
                  <p className="text-white/40 max-w-sm mb-8">
                    Stay organized and keep track of your goals. Create your first task to get started.
                  </p>
                  <Button onClick={() => openAddPanel()} className="bg-white text-black">
                    Create First Task
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {view === "kanban" ? (
                    <KanbanView
                      tasks={tasks}
                      onEdit={openEditPanel}
                      onAddTask={openAddPanel}
                      // onDelete={handleDeleteTask}
                      // onStatusChange={handleStatusChange}
                    />
                  ) : (
                    <TaskTable
                      tasks={tasks}
                      onEdit={openEditPanel}
                      onDelete={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                    />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showChatBar && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-[400px] shrink-0 h-full z-40 relative shadow-2xl"
            >
              <ChatSidePanel
                messages={messages}
                input={input}
                setInput={(v) => {
                  setInput(v);
                }}
                isLoading={isChatLoading}
                sendMessage={(msg, opts) => sendMessageWithMemory(msg, opts)}
                regenerate={regenerateWithMemory}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                onClose={() => setShowChatBar(false)}
                selectedTask={selectedChatTask}
                setSelectedTask={setSelectedChatTaskId}
                onClearChat={handleClearChat}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeDragTask ? (
            <div className="w-[300px]">
              <TaskCard task={activeDragTask} isOverlay />
            </div>
          ) : null}
        </DragOverlay>

        <TaskSidePanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          task={selectedTaskId?.startsWith("new") ? { status: selectedTaskId.split("-")[1] } : selectedTask}
          onSubmit={selectedTask?._id ? handleUpdateTask : handleCreateTask}
          onDelete={handleDeleteTask}
        />

        <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none overflow-hidden h-[100vh] flex items-end">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2810%29-UnDKstODkIENp5xqTYUEpt0Sm8tNOw.png"
            alt="Decorative Background"
            className="w-full h-auto object-cover object-bottom opacity-70 mix-blend-lighten scale-110"
          />
        </div>
      </div>
    </DndContext>
  );
}

function ChatDroppable({ children }: { children: React.ReactNode }) {
  return children;
}

function ChatToggleDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "chat-toggle-dropzone",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-300 rounded-full p-0.5",
        isOver && "bg-indigo-500/20 ring-4 ring-indigo-500/20 scale-125 shadow-lg shadow-indigo-500/20"
      )}
    >
      {children}
    </div>
  );
}

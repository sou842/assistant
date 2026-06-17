"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NoteEditor } from "@/app/ai/vault/_components/note-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Delete, Loader2, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(100000).optional(),
  status: z.enum(["todo", "in-progress", "done", "backlog"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.date().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  onSubmit: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskSidePanel({ isOpen, onClose, task, onSubmit, onDelete }: TaskSidePanelProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
      });
    }
  }, [task, form, isOpen]);

  const handleDelete = async () => {
    if (!task?._id) return;
    setIsSubmitting(true);
    try {
      await onDelete(task._id);
      onClose();
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (values: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (error) {
      console.error("Error submitting task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        hideCloseButton
        className={cn(
          "bg-app-canvas/95 backdrop-blur-xl border-l border-app-border-default text-app-text-primary p-0 flex flex-col shadow-2xl transition-all duration-300",
          isExpanded ? "sm:max-w-4xl w-[90vw]" : "sm:max-w-lg"
        )}
      >
        {/* Header Section */}
        <div className="px-2 py-2 sm:px-4 border-b border-app-border-subtle bg-white/5 pr-14">
          <SheetHeader className="p-0 space-y-1.5 flex flex-row justify-between items-center">
            <div className="flex flex-col justify-between gap-1">
              <SheetTitle className="text-sm font-semibold text-app-text-primary tracking-tight">
                {task?._id ? "Edit Task" : "Add Task"}
              </SheetTitle>
              <SheetDescription className="text-xs text-app-text-muted">
                {task?._id
                  ? "Update the details of your task."
                  : "Create a new task to track your progress."}
              </SheetDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-app-text-muted hover:text-app-text-primary h-8 w-8 rounded-full"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </SheetHeader>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-app-text-soft">Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What needs to be done?"
                        className="h-11 rounded-full bg-app-surface-glass border-app-border-default focus-visible:ring-1 focus-visible:ring-app-border-strong text-app-text-primary text-base transition-all shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-app-text-soft">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-12 bg-app-surface-glass border-app-border-default focus:ring-1 focus:ring-app-border-strong rounded-full transition-all shadow-sm">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-app-border-default text-app-text-primary rounded-xl shadow-xl">
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-app-text-soft">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-12 bg-app-surface-glass border-app-border-default focus:ring-1 focus:ring-app-border-strong rounded-full transition-all shadow-sm">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-app-border-default text-app-text-primary rounded-xl shadow-xl">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium text-app-text-soft">Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-11 pl-4 text-left font-normal bg-app-surface-glass dark:border-app-border-default hover:bg-white/5 hover:text-app-text-primary rounded-full transition-all shadow-sm",
                              !field.value && "text-app-text-muted"
                            )}
                          >
                            {field?.value ? (
                              format(field?.value, "PPP")
                            ) : (
                              <span>Set a due date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-950 border-app-border-default rounded-xl shadow-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={field?.value || undefined}
                          onSelect={field?.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-app-text-soft">Description</FormLabel>
                    <FormControl>
                      <div className="bg-app-surface-glass border border-app-border-default transition-all duration-200 focus-within:ring-1 focus-within:ring-app-border-strong focus-within:border-app-border-strong rounded-xl overflow-hidden min-h-[200px] text-base relative z-10 px-3 shadow-sm">
                        <NoteEditor
                          compact
                          initialData={field.value}
                          onChange={(data) => {
                            field.onChange(typeof data === 'string' ? data : JSON.stringify(data));
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 sm:px-8 border-t border-app-border-subtle bg-app-canvas/80 flex flex-row items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
            className="flex-1 h-11 rounded-full bg-white text-zinc-950 font-medium hover:bg-gray-200 transition-colors shadow-sm"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task?._id ? "Save Changes" : "Create Task"}
          </Button>
          {task?._id && (
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5 rounded-full bg-transparent border dark:border-app-border-default hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
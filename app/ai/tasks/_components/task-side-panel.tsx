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
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(1000).optional(),
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
      <SheetContent className="sm:max-w-lg bg-black/90 backdrop-blur-3xl border-white/10 text-white p-0 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <SheetHeader className="p-0 gap-1">
            <SheetTitle className="text-xl font-semibold text-white">
              {task?._id ? "Edit Task" : "Add Task"}
            </SheetTitle>
            <SheetDescription className="text-white/40">
              {task?._id ? "Update the details of your task." : "Create a new task to track your progress."}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60">Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What needs to be done?"
                        className="h-12 rounded bg-white/5 border-white/10 focus:border-white/20 text-white text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add more context to this task..."
                        className="bg-white/5 border-white/10 focus:border-white/20 min-h-[140px] text-base resize-none rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-11 bg-white/5 border-white/10 focus:border-white/20 rounded-lg">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
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
                      <FormLabel className="text-white/60">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-11 bg-white/5 border-white/10 focus:border-white/20 rounded-lg">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
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
                    <FormLabel className="text-white/60">Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-11 pl-3 text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 hover:text-white rounded-lg",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Set a due date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-950 border-white/10" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="p-4 border-t border-white/5 bg-white/2 flex flex-col-reverse items-center justify-between gap-4">
          {task?._id && (
            <Button
              type="button"
              variant="ghost"
              className="w-full h-12 px-6 rounded-full text-gray-500 bg-transparent border border-white/10 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
            className="w-full px-8 h-12 rounded-full bg-white text-black hover:bg-white/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task?._id ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

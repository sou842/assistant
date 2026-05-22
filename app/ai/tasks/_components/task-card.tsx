"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
  task: any;
  onEdit?: (task: any) => void;
  isOverlay?: boolean;
  isSortable?: boolean;
}

export function TaskCard({ task, onEdit, isOverlay, isSortable = true }: TaskCardProps) {
  const sortable = useSortable({ 
    id: String(task._id),
    disabled: !isSortable 
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[120px] rounded-xl bg-app-surface-glass-soft border border-dashed border-app-border-default"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit?.(task)}
      className={cn(
        "group relative p-5 rounded-2xl bg-app-surface border border-app-border-default hover:border-app-border-strong hover:bg-app-surface-hover transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md",
        isOverlay && "cursor-grabbing shadow-2xl scale-105 border-app-border-strong bg-app-surface-elevated"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-app-text-primary capitalize group-hover:text-app-text-secondary leading-tight">
            {task.title}
          </h4>
          <Badge
            variant="outline"
            className={cn(
              "text-xs h-5 px-1.5 capitalize border-app-border-default rounded-full",
              task.priority === "urgent" && "bg-red-500/10 text-red-400 border-red-500/20",
              task.priority === "high" && "bg-orange-500/10 text-orange-400 border-orange-500/20",
              task.priority === "medium" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
              task.priority === "low" && "bg-slate-500/10 text-slate-400 border-slate-500/20"
            )}
          >
            {task.priority}
          </Badge>
        </div>

        {task?.description && (
          <p className="text-xs text-app-text-soft line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          {task?.dueDate && (
            <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
              <Calendar size={12} />
              <span>{format(new Date(task.dueDate), "MMM d")}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-app-text-muted ml-auto">
             <Clock size={12} />
             <span>{format(new Date(task.updatedAt || task.createdAt), "HH:mm")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

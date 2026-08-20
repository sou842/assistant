"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function getTaskPreviewText(description?: string) {
  if (!description) return "";
  try {
    if (description?.trim()?.startsWith("{") || description?.trim()?.startsWith("[")) {
      const parsed = JSON.parse(description);
      const blocks = Array.isArray(parsed) ? parsed : parsed.blocks;
      if (Array.isArray(blocks)) {
        return blocks
          ?.filter((b: any) => ["paragraph", "header", "list", "quote"].includes(b.type))
          ?.map((b: any) => {
            if (b.type === "paragraph" || b.type === "header" || b.type === "quote") {
              return b.data?.text || "";
            } else if (b.type === "list") {
              return b.data?.items?.map((item: any) => typeof item === "string" ? item : item.content || "").join(" ") || "";
            }
            return "";
          })
          ?.join(" ")
          ?.replace(/<[^>]*>?/gm, "") // Strip HTML tags
          ?.trim();
      }
    }
  } catch (e) {
    // Ignore parse error, return as-is
  }
  return description;
}

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
        className="h-[120px] rounded-2xl bg-app-surface-elevated/25 border border-transparent"
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
        "group relative p-5 rounded-2xl bg-app-surface border border-transparent hover:bg-app-surface-hover transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md",
        isOverlay && "cursor-grabbing shadow-2xl scale-105 bg-app-surface-elevated border border-transparent"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[13px] font-medium text-app-text-primary capitalize group-hover:text-app-text-secondary leading-tight">
            {task.title}
          </h4>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 px-2 py-0.5 capitalize border-transparent rounded-full font-medium shrink-0",
              task.priority === "urgent" && "bg-red-500/10 text-red-400",
              task.priority === "high" && "bg-orange-500/10 text-orange-400",
              task.priority === "medium" && "bg-blue-500/10 text-blue-400",
              task.priority === "low" && "bg-slate-500/10 text-slate-400"
            )}
          >
            {task.priority}
          </Badge>
        </div>

        {task?.description && (
          <p className="text-xs text-app-text-muted line-clamp-2 leading-relaxed">
            {getTaskPreviewText(task.description)}
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

"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "slate" },
  { id: "todo", title: "To Do", color: "blue" },
  { id: "in-progress", title: "In Progress", color: "amber" },
  { id: "done", title: "Done", color: "emerald" },
];

interface KanbanViewProps {
  tasks: any[];
  onEdit: (task: any) => void;
  onAddTask: (status: string) => void;
}

export function KanbanView({ tasks, onEdit, onAddTask }: KanbanViewProps) {
  return (
    <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start h-full overflow-x-auto pb-4 scrollbar-hide snap-x">
      {COLUMNS.map((column) => (
        <div key={column.id} className="w-[280px] sm:w-[320px] md:w-auto shrink-0 snap-center">
          <KanbanColumn
            id={column.id}
            title={column.title}
            tasks={tasks.filter((t) => t.status === column.id)}
            onEdit={onEdit}
            onAddTask={() => onAddTask(column.id)}
            color={column.color}
          />
        </div>
      ))}
    </div>
  );
}


function KanbanColumn({ id, title, tasks, onEdit, onAddTask, color }: any) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-210px)] md:h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "size-2 rounded-full",
            color === "slate" && "bg-slate-500",
            color === "blue" && "bg-blue-500",
            color === "amber" && "bg-amber-500",
            color === "emerald" && "bg-emerald-500"
          )} />
          <h3 className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">{title}</h3>
          <Badge variant="outline" className="bg-app-surface-elevated border border-transparent text-app-text-muted rounded-full px-2 py-0.5 text-[10px]">
            {tasks.length}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-7 hover:bg-app-surface-elevated text-app-text-muted hover:text-app-text-primary rounded-full"
          onClick={onAddTask}
        >
          <Plus size={13} />
        </Button>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-3 p-3 rounded-2xl bg-app-surface-elevated/35 border border-transparent transition-colors"
      >
        <SortableContext items={tasks.map((t: any) => String(t._id))} strategy={verticalListSortingStrategy}>
          {tasks?.map((task: any) => (
            <TaskCard key={String(task._id)} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-app-text-muted italic text-[13px]">
            No tasks here
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start rounded-full text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated text-xs h-9 px-3"
          onClick={onAddTask}
        >
          <Plus size={13} className="mr-2" />
          Add task
        </Button>
      </div>
    </div>
  );
}

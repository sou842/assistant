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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start h-full">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          id={column.id}
          title={column.title}
          tasks={tasks.filter((t) => t.status === column.id)}
          onEdit={onEdit}
          onAddTask={() => onAddTask(column.id)}
          color={column.color}
        />
      ))}
    </div>
  );
}


function KanbanColumn({ id, title, tasks, onEdit, onAddTask, color }: any) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col gap-6 h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "size-2 rounded-full",
            color === "slate" && "bg-slate-500",
            color === "blue" && "bg-blue-500",
            color === "amber" && "bg-amber-500",
            color === "emerald" && "bg-emerald-500"
          )} />
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h3>
          <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 rounded-full">
            {tasks.length}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-8 hover:bg-white/5 text-white/40 hover:text-white"
          onClick={onAddTask}
        >
          <Plus size={14} />
        </Button>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-4 p-3 rounded-2xl bg-white/6 border border-dashed border-white/5 transition-colors"
      >
        <SortableContext items={tasks.map((t: any) => String(t._id))} strategy={verticalListSortingStrategy}>
          {tasks?.map((task: any) => (
            <TaskCard key={String(task._id)} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-white/10 italic text-sm">
            No tasks here
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start rounded-full text-white/40 hover:text-white/40 hover:bg-white/5 border border-dashed border-transparent hover:border-white/5 h-10 px-3"
          onClick={onAddTask}
        >
          <Plus size={14} className="mr-2" />
          Add task
        </Button>
      </div>
    </div>
  );
}

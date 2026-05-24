'use client';

import { useMemo, useState } from 'react';
import { useToolRegistry } from '@/lib/workflow/registry';
import * as LucideIcons from 'lucide-react';
import { Search } from 'lucide-react';

export function Sidebar() {
  const { tools, isLoading } = useToolRegistry();
  const [search, setSearch] = useState('');

  const onDragStart = (event: React.DragEvent, toolId: string) => {
    event.dataTransfer.setData('application/reactflow', toolId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredTools = useMemo(() => tools?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  ), [tools, search]);

  return (
    <aside className="w-72 h-full border-r bg-background/50 backdrop-blur-xl flex flex-col shadow-xl z-10">
      <div className="p-4 border-b flex flex-col gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tools..."
            className="w-full bg-muted border-none rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground mt-10">Loading tools...</p>
        ) : filteredTools?.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-10">No tools found.</p>
        ) : (
          filteredTools.map((tool) => {
            const Icon = (LucideIcons as any)[tool.icon] || LucideIcons.Box;
            return (
              <div
                key={tool.id}
                className="group flex items-start gap-3 p-3 rounded-xl border bg-card/50 hover:bg-accent/50 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all duration-300"
                draggable
                onDragStart={(e) => onDragStart(e, tool.id)}
              >
                <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate">{tool.name}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {tool.description}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

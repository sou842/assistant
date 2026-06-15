'use client';

import { type Node, Handle, Position, NodeProps } from '@xyflow/react';
import { useToolRegistry } from '@/lib/workflow/registry';
import { NodeExecutionState } from '@/lib/workflow/types';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export type CustomNodeData = {
  toolId: string;
  config?: Record<string, any>;
  state?: NodeExecutionState;
};

export function CustomNode({ data, selected }: NodeProps<Node<CustomNodeData>>) {
  const { getTool } = useToolRegistry();
  const state = data.state;
  const tool = getTool(data.toolId as string) || {
    id: data.toolId as string,
    name: (data.toolId as string).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    category: "Schedule Action",
    icon: "Activity",
    inputs: [{ name: 'in', type: 'any', isConnection: true }],
    outputs: [{ name: 'out', type: 'any' }],
    execute: async () => ({})
  } as any;

  const Icon = useMemo(() => {
    if (!tool) return LucideIcons.Box;
    return (LucideIcons as any)[tool.icon] || LucideIcons.Box;
  }, [tool]);

  // Filter handles
  const inputHandles = tool.inputs.filter((i) => i.isConnection);
  const outputHandles = tool.outputs;

  const statusColor = 
    state?.status === 'running' ? 'border-blue-500 ring-2 ring-blue-500/50' :
    state?.status === 'success' ? 'border-green-500' :
    state?.status === 'error' ? 'border-red-500 ring-2 ring-red-500/50' :
    selected ? 'border-primary ring-2 ring-primary/20' : 'border-border';

  return (
    <div className={cn(
      "w-72 bg-background/80 backdrop-blur-xl border rounded-2xl shadow-xl transition-all duration-300",
      statusColor
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 bg-muted/30 rounded-t-2xl">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{tool.name}</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{tool.category}</p>
        </div>
        
        {/* Status Indicator */}
        <div className="ml-auto">
          {state?.status === 'running' && <LucideIcons.Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {state?.status === 'success' && <LucideIcons.CheckCircle2 className="w-4 h-4 text-green-500" />}
          {state?.status === 'error' && <LucideIcons.AlertCircle className="w-4 h-4 text-red-500" />}
        </div>
      </div>

      {/* Body: Inputs & Outputs side by side visually */}
      <div className="p-4 flex flex-col gap-3">
        {/* Connection Handles */}
        <div className="flex justify-between relative">
          
          {/* Inputs */}
          <div className="flex flex-col gap-2 relative">
            {inputHandles.map((input, idx) => (
              <div key={input.name} className="relative flex items-center h-6">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.name}
                  className="w-3 h-3 bg-blue-500 border-2 border-background !-left-5"
                />
                <span className="text-xs font-medium text-foreground ml-1">{input.name}</span>
              </div>
            ))}
          </div>

          {/* Outputs */}
          <div className="flex flex-col gap-2 relative items-end">
            {outputHandles.map((output, idx) => (
              <div key={output.name} className="relative flex items-center justify-end h-6">
                <span className="text-xs font-medium text-foreground mr-1">{output.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.name}
                  className="w-3 h-3 bg-purple-500 border-2 border-background !-right-5"
                />
              </div>
            ))}
          </div>

        </div>

        {/* Display Error Message if any */}
        {state?.error && (
          <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
}

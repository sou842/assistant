'use client';

import { useToolRegistry } from '@/lib/workflow/registry';
import { Node } from '@xyflow/react';
import { Cable } from 'lucide-react';

interface ConfigPanelProps {
  selectedNode: Node | null;
  updateNodeConfig: (nodeId: string, config: Record<string, any>) => void;
}

export function ConfigPanel({ selectedNode, updateNodeConfig }: ConfigPanelProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 h-full border-l bg-background/50 backdrop-blur-xl flex flex-col items-center justify-center text-muted-foreground shadow-xl z-10 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 mb-4 flex items-center justify-center border border-dashed">
          <Cable className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Select a node to configure</p>
      </aside>
    );
  }

  const { getTool } = useToolRegistry();
  const tool = getTool(selectedNode.data.toolId as string);
  const currentConfig = (selectedNode.data.config as Record<string, any>) || {};

  if (!tool) {
    return (
      <aside className="w-80 h-full border-l bg-background/50 backdrop-blur-xl flex flex-col p-4 z-10">
        <p className="text-red-500 text-sm">Unknown tool selected.</p>
      </aside>
    );
  }

  const staticInputs = tool.inputs.filter((i) => !i.isConnection);

  const handleChange = (name: string, value: any) => {
    updateNodeConfig(selectedNode.id, {
      ...currentConfig,
      [name]: value,
    });
  };

  return (
    <aside className="w-80 h-full border-l bg-background/50 backdrop-blur-xl flex flex-col shadow-xl z-10">
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground mt-1">Configure {tool.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {staticInputs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center italic mt-10">
            No static configuration required for this tool.
          </p>
        ) : (
          staticInputs.map((input) => (
            <div key={input.name} className="flex flex-col gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                {input.name}
                {input.required && <span className="text-red-500">*</span>}
              </label>
              <p className="text-[10px] text-muted-foreground -mt-1">{input.description}</p>

              {/* Simple Input Render based on type */}
              {input.type === 'string' ? (
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentConfig[input.name] || ''}
                  onChange={(e) => handleChange(input.name, e.target.value)}
                  placeholder={`Enter ${input.name}...`}
                />
              ) : input.type === 'boolean' ? (
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300"
                  checked={!!currentConfig[input.name]}
                  onChange={(e) => handleChange(input.name, e.target.checked)}
                />
              ) : (
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentConfig[input.name] || ''}
                  onChange={(e) => handleChange(input.name, e.target.value)}
                />
              )}
            </div>
          ))
        )}

        {/* Display Output Result if available */}
        {(selectedNode.data.state as any)?.result && (
          <div className="mt-8 pt-4 border-t border-border">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Execution Result
            </h3>
            <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto border whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {JSON.stringify((selectedNode.data.state as any).result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}

import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nanoid } from 'nanoid';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CustomNode } from './CustomNode';
import { Sidebar } from './Sidebar';
import { ConfigPanel } from './ConfigPanel';
import { executeWorkflow, UpdateNodeStateCallback } from '@/lib/workflow/engine';
import { NodeExecutionState } from '@/lib/workflow/types';
import { useToolRegistry } from '@/lib/workflow/registry';
import { PREBUILT_TEMPLATES } from '@/lib/workflow/templates';

const nodeTypes = {
  customTool: CustomNode,
};

let id = 0;
const getId = () => `dndnode_${id++}_${nanoid(4)}`;

export interface FlowCanvasHandle {
  runWorkflow: () => Promise<void>;
  saveWorkflow: (name: string) => void;
  hasNodes: boolean;
}

interface FlowEditorProps {
  onExecutingChange?: (isExecuting: boolean) => void;
  initialTemplateId?: string | null;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  readOnly?: boolean;
  onSaveNodeConfig?: (nodeId: string, newConfig: any) => void;
}

const FlowEditor = forwardRef<FlowCanvasHandle, FlowEditorProps>(({ onExecutingChange, initialTemplateId, initialNodes, initialEdges, readOnly, onSaveNodeConfig }, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();

  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { isLoading: isRegistryLoading } = useToolRegistry();

  useEffect(() => {
    if (initialNodes && initialEdges) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else if (initialTemplateId && PREBUILT_TEMPLATES[initialTemplateId]) {
      const template = PREBUILT_TEMPLATES[initialTemplateId];
      setNodes(template.nodes);
      setEdges(template.edges);
    } else if (initialTemplateId?.startsWith('workflow_')) {
      const existing = JSON.parse(localStorage.getItem('ai_workflows') || '[]');
      const saved = existing.find((w: any) => w.id === initialTemplateId);
      if (saved) {
        setNodes(saved.nodes || []);
        setEdges(saved.edges || []);
      }
    } else if (!initialTemplateId) {
      try {
        const draft = JSON.parse(localStorage.getItem('ai_workflow_draft') || 'null');
        if (draft && draft.nodes) {
          setNodes(draft.nodes);
          setEdges(draft.edges || []);
        }
      } catch (e) {}
    }
  }, [initialTemplateId, initialNodes, initialEdges, setNodes, setEdges]);

  // Auto-save draft
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem('ai_workflow_draft', JSON.stringify({ nodes, edges }));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const toolId = event.dataTransfer.getData('application/reactflow');
      if (!toolId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type: 'customTool',
        position,
        data: {
          toolId,
          config: {},
          state: { status: 'idle' } as NodeExecutionState
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, config } };
        }
        return n;
      })
    );
    if (onSaveNodeConfig) {
      onSaveNodeConfig(nodeId, config);
    }
  }, [setNodes, onSaveNodeConfig]);

  const updateNodeState: UpdateNodeStateCallback = useCallback((nodeId, stateUpdate) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              state: { ...(n.data.state as NodeExecutionState), ...stateUpdate }
            }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  const handleRun = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    onExecutingChange?.(true);
    toast.info('Starting workflow execution...');
    try {
      await executeWorkflow(nodes, edges, updateNodeState);
      toast.success('Workflow executed successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(`Workflow failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
      onExecutingChange?.(false);
    }
  };

  const handleSave = (name: string) => {
    const workflow = {
      id: `workflow_${nanoid(8)}`,
      name,
      createdAt: new Date().toISOString(),
      nodes,
      edges,
    };
    
    const existing = JSON.parse(localStorage.getItem('ai_workflows') || '[]');
    existing.push(workflow);
    localStorage.setItem('ai_workflows', JSON.stringify(existing));
    toast.success(`Workflow "${name}" saved!`);
  };

  useImperativeHandle(ref, () => ({
    runWorkflow: handleRun,
    saveWorkflow: handleSave,
    hasNodes: nodes.length > 0,
  }));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  if (isRegistryLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading Tool Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden selection:bg-primary/30">
      {!readOnly && <Sidebar />}

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onDrop={readOnly ? undefined : onDrop}
          onDragOver={readOnly ? undefined : onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          nodesConnectable={!readOnly}
          nodesDraggable={!readOnly}
          elementsSelectable={true}
          fitView
          className="bg-dot-pattern"
          defaultEdgeOptions={{
            style: { strokeWidth: 3 },
            className: "stroke-primary/50 hover:stroke-primary transition-colors"
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-40" />
          <Controls className="bg-background/80 backdrop-blur-md border rounded-xl shadow-lg !p-1 flex flex-col gap-1 [&>button]:!border-none [&>button]:!bg-transparent [&>button:hover]:!bg-muted [&>button]:!rounded-lg" />
        </ReactFlow>
      </div>

      {selectedNode &&
        <ConfigPanel
          selectedNode={selectedNode}
          updateNodeConfig={updateNodeConfig}
        />
      }
    </div>
  );
});

FlowEditor.displayName = 'FlowEditor';

const FlowCanvas = forwardRef<FlowCanvasHandle, FlowEditorProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <FlowEditor ref={ref} {...props} />
    </ReactFlowProvider>
  );
});

FlowCanvas.displayName = 'FlowCanvas';

export default FlowCanvas;

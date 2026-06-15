import { Edge, Node } from '@xyflow/react';
import { NodeExecutionState, ExecutionStatus } from './types';

// Basic topological sort
export function getExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adjList.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    const from = e.source;
    const to = e.target;
    adjList.get(from)?.push(to);
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);

    const neighbors = adjList.get(curr) || [];
    for (const next of neighbors) {
      inDegree.set(next, (inDegree.get(next) || 0) - 1);
      if (inDegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length !== nodes.length) {
    throw new Error('Circular dependency detected in workflow graph.');
  }

  return order;
}

export type UpdateNodeStateCallback = (nodeId: string, state: Partial<NodeExecutionState>) => void;

export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  updateNodeState: UpdateNodeStateCallback
) {
  try {
    // 1. Reset all nodes to pending
    nodes.forEach((n) => updateNodeState(n.id, { status: 'pending', result: undefined, error: undefined }));

    // 2. Get order
    let order: string[] = [];
    try {
      order = getExecutionOrder(nodes, edges);
    } catch (err: any) {
      throw new Error(`Invalid workflow configuration: ${err.message}`);
    }

    // 3. Execution Context
    const nodeResults = new Map<string, Record<string, any>>();

    // 4. Run sequentially
    for (const nodeId of order) {
      updateNodeState(nodeId, { status: 'running' });

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Gather inputs
      const inputs: Record<string, any> = { ...((node.data.config as any) || {}) };

      // Look at incoming edges for connected inputs
      const incomingEdges = edges.filter((e) => e.target === nodeId);
      for (const edge of incomingEdges) {
        const sourceNodeId = edge.source;
        const sourceOutputHandle = edge.sourceHandle; // e.g. 'response'
        const targetInputHandle = edge.targetHandle; // e.g. 'input'

        if (sourceOutputHandle && targetInputHandle) {
          const sourceResult = nodeResults.get(sourceNodeId);
          if (sourceResult) {
            inputs[targetInputHandle] = sourceResult[sourceOutputHandle];
          }
        }
      }

      // Execute
      try {
        let result;
        
        if (node.data.toolId === 'manual-input') {
          result = { output: inputs.text || '' };
        } else if (node.data.toolId === 'text-output') {
          result = { value: inputs.input };
        } else {
          // Call the backend execution route
          const res = await fetch('/api/workflow/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toolId: node.data.toolId,
              inputs
            })
          });
          
          let data;
          try {
            data = await res.json();
          } catch (e) {
            throw new Error('Failed to parse backend response');
          }
          
          if (!res.ok || data.error) {
            throw new Error(data.error || 'Backend execution failed');
          }
          result = data.result;
        }

        nodeResults.set(nodeId, result);
        updateNodeState(nodeId, { status: 'success', result });
      } catch (err: any) {
        const errMsg = err.message || 'Execution failed';
        updateNodeState(nodeId, { status: 'error', error: errMsg });
        throw new Error(`Execution failed at node ${node.data.toolId || nodeId}: ${errMsg}`);
      }
    }
  } catch (err: any) {
    console.error('Workflow execution aborted:', err);
    throw err; // Let caller handle it for UI toast
  }
}

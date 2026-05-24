export type ToolParameterType = 'string' | 'number' | 'boolean' | 'json';

export interface ToolParameter {
  name: string;
  type: ToolParameterType;
  description: string;
  required: boolean;
  /**
   * If true, this parameter is a node input handle (connected via an edge). 
   * If false, it's configured statically in the UI properties panel.
   */
  isConnection?: boolean; 
}

export interface WorkflowTool {
  id: string;
  name: string;
  description: string;
  category: 'input' | 'ai' | 'action' | 'output';
  icon: string; // We'll use lucide-react icon names
  inputs: ToolParameter[];
  outputs: ToolParameter[];
  execute: (inputs: Record<string, any>) => Promise<Record<string, any>>;
}

export type ExecutionStatus = 'idle' | 'pending' | 'running' | 'success' | 'error';

export interface NodeExecutionState {
  status: ExecutionStatus;
  result?: Record<string, any>;
  error?: string;
}

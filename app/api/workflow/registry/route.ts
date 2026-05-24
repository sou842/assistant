import { NextResponse } from 'next/server';
import { tools } from '@/app/api/chat/tools';
import zodToJsonSchema from 'zod-to-json-schema';
import { WorkflowTool, ToolParameter, ToolParameterType } from '@/lib/workflow/types';

export async function GET() {
  const registry: WorkflowTool[] = [];

  for (const [id, toolDef] of Object.entries(tools)) {
    // Generate JSON schema from the tool's zod schema
    const jsonSchema: any = zodToJsonSchema(toolDef.inputSchema as any, { target: 'jsonSchema7' });

    const inputs: ToolParameter[] = [];
    
    if (jsonSchema.type === 'object' && jsonSchema.properties) {
      const requiredFields = jsonSchema.required || [];

      for (const [key, prop] of Object.entries<any>(jsonSchema.properties)) {
        let paramType: ToolParameterType = 'string';
        if (prop.type === 'number' || prop.type === 'integer') paramType = 'number';
        if (prop.type === 'boolean') paramType = 'boolean';
        if (prop.type === 'array' || prop.type === 'object') paramType = 'json';

        inputs.push({
          name: key,
          type: paramType,
          description: prop.description || '',
          required: requiredFields.includes(key),
          isConnection: true, // we'll treat all AI tools inputs as connectable
        });
      }
    }

    registry.push({
      id,
      name: id, // e.g. "githubListRepos"
      description: toolDef.description || '',
      category: 'ai', // All AI SDK tools will be grouped here
      icon: 'Puzzle', // Generic icon
      inputs,
      outputs: [
        {
          name: 'result',
          type: 'json',
          description: 'The output result of the tool execution',
          required: true,
        }
      ],
      execute: async () => ({}) // Dummy function, not used on frontend
    });
  }

  // Also include some utility tools that are purely client-side or generic
  registry.push({
    id: 'manual-input',
    name: 'Text Input',
    description: 'Provides a static text string to the workflow.',
    category: 'input',
    icon: 'Type',
    inputs: [
      {
        name: 'text',
        type: 'string',
        description: 'The text to output',
        required: true,
        isConnection: false,
      },
    ],
    outputs: [
      {
        name: 'output',
        type: 'string',
        description: 'The provided text',
        required: true,
      },
    ],
    execute: async () => ({})
  });

  registry.push({
    id: 'text-output',
    name: 'Text Output',
    description: 'Displays text data in the workflow.',
    category: 'output',
    icon: 'Monitor',
    inputs: [
      {
        name: 'input',
        type: 'string',
        description: 'The text to display',
        required: true,
        isConnection: true,
      },
    ],
    outputs: [],
    execute: async () => ({})
  });

  registry.push({
    id: 'llm-prompt',
    name: 'LLM Prompt',
    description: 'Sends a prompt to an AI model and returns the response.',
    category: 'ai',
    icon: 'BrainCircuit',
    inputs: [
      {
        name: 'systemPrompt',
        type: 'string',
        description: 'System instructions for the AI',
        required: false,
        isConnection: false,
      },
      {
        name: 'input',
        type: 'string',
        description: 'The user input text',
        required: true,
        isConnection: true,
      },
    ],
    outputs: [
      {
        name: 'response',
        type: 'string',
        description: 'The AI generated response',
        required: true,
      },
    ],
    execute: async () => ({})
  });

  return NextResponse.json(registry);
}

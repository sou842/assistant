import { NextResponse } from 'next/server';
import { tools } from '@/app/api/chat/tools';

export async function POST(req: Request) {
  try {
    const { toolId, inputs } = await req.json();

    // Special handling for llm-prompt tool which isn't in tools.ts
    if (toolId === 'llm-prompt') {
      try {
        const fetchRes = await fetch(new URL('/api/chat', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              ...(inputs.systemPrompt ? [{ role: 'system', content: inputs.systemPrompt }] : []),
              { role: 'user', content: inputs.input }
            ]
          }),
        });
        
        if (!fetchRes.ok) {
           return NextResponse.json({ error: 'Failed to fetch AI response' }, { status: 500 });
        }

        const text = await fetchRes.text(); 
        const cleanText = text.replace(/0:"/g, '').replace(/"\n/g, '').replace(/\\n/g, '\n');

        return NextResponse.json({ result: { response: cleanText } });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'LLM execution failed' }, { status: 500 });
      }
    }

    if (!toolId || !tools[toolId as keyof typeof tools]) {
      return NextResponse.json({ error: `Tool ${toolId} not found or invalid` }, { status: 400 });
    }

    const toolDef = tools[toolId as keyof typeof tools];

    // Validate inputs
    let parsedInputs;
    try {
      parsedInputs = (toolDef.inputSchema as any).parse(inputs);
    } catch (e: any) {
      return NextResponse.json({ error: `Validation Error: ${e.message}` }, { status: 400 });
    }

    // Execute tool
    if (!toolDef.execute) {
      return NextResponse.json({ error: `Tool ${toolId} has no execute function` }, { status: 400 });
    }
    
    const result = await toolDef.execute(parsedInputs, {
      toolCallId: 'workflow-call',
      messages: []
    } as any);

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('Workflow tool execution failed:', error);
    return NextResponse.json({ error: error.message || 'Internal execution error' }, { status: 500 });
  }
}

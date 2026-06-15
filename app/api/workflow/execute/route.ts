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
          headers: { 
            'Content-Type': 'application/json',
            'cookie': req.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            messages: [
              ...(inputs.systemPrompt ? [{ id: Math.random().toString(36).slice(2), role: 'system', content: inputs.systemPrompt }] : []),
              { id: Math.random().toString(36).slice(2), role: 'user', content: inputs.input || '' }
            ]
          }),
        });
        
        if (!fetchRes.ok) {
           const errText = await fetchRes.text();
           return NextResponse.json({ error: `AI Error: ${fetchRes.status} ${errText}` }, { status: 500 });
        }

        const text = await fetchRes.text(); 
        console.log('Raw API Response text length:', text.length);
        console.log('Raw API Response (first 100 chars):', text.substring(0, 100));
        
        const chunks = text.split('\n');
        let cleanText = '';
        for (const chunk of chunks) {
          const trimmed = chunk.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'text-delta' && data.delta) {
                cleanText += data.delta;
              }
            } catch(e) {}
          } else if (trimmed.startsWith('0:')) {
            try {
              cleanText += JSON.parse(trimmed.substring(2));
            } catch(e) {}
          }
        }
        
        console.log('Parsed Clean Text length:', cleanText.length);
        console.log('Parsed Clean Text (first 100 chars):', cleanText.substring(0, 100));

        // Fallback: if we couldn't parse it with `0:`, maybe it's not encoded that way
        if (cleanText === '' && text.length > 0) {
           cleanText = text; // Just return raw text to see it in UI
        }

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

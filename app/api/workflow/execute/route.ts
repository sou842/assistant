import { NextResponse } from 'next/server';
import { tools } from '@/app/api/chat/tools';
import dbConnect from '@/lib/mongodb';
import Workflow from '@/lib/models/Workflow';
import { auth } from '@/auth';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workflowName, workflowId, toolId, inputs = {} } = body;

    const targetIdentifier = workflowName || workflowId || toolId;
    if (!targetIdentifier) {
      return NextResponse.json({ error: 'Please provide workflowName, workflowId, or toolId' }, { status: 400 });
    }

    // 1. Check if it's a Saved Workflow from DB (by ID or Title)
    if (workflowId || workflowName) {
      await dbConnect();
      const session = await auth();

      let query: any = {};
      if (workflowId && mongoose.Types.ObjectId.isValid(workflowId)) {
        query = { _id: workflowId };
      } else if (workflowName) {
        const escaped = workflowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query = { title: { $regex: new RegExp(`^${escaped}$`, 'i') } };
      }

      if (session?.user?.id) {
        query = {
          $and: [
            query,
            { $or: [{ userId: session.user.id }, { isPublic: true }] }
          ]
        };
      }

      let workflow = await Workflow.findOne(query);

      // Fuzzy fallback on title if exact name match wasn't found
      if (!workflow && workflowName) {
        const simpleName = workflowName.split('/').pop() || workflowName;
        workflow = await Workflow.findOne({
          title: { $regex: new RegExp(simpleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        });
      }

      if (workflow) {
        if (workflow.script) {
          try {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const runner = new AsyncFunction('inputs', 'tools', `
              try {
                ${workflow.script}
                if (typeof workflow === 'function') {
                  return await workflow(null, inputs);
                }
                return { success: true, message: "Workflow executed successfully", data: inputs };
              } catch (e) {
                return { success: false, error: e.message };
              }
            `);

            const executionResult = await runner(inputs, tools);
            return NextResponse.json({ 
              success: true, 
              workflowId: workflow._id,
              workflowTitle: workflow.title,
              result: executionResult 
            });
          } catch (scriptErr: any) {
            console.error('Workflow script execution failed:', scriptErr);
            return NextResponse.json({ 
              success: false, 
              error: `Workflow execution error: ${scriptErr.message}` 
            }, { status: 500 });
          }
        }

        return NextResponse.json({
          success: true,
          workflowId: workflow._id,
          workflowTitle: workflow.title,
          result: { success: true, data: workflow, inputs }
        });
      }
    }

    // 2. Special handling for llm-prompt tool
    const actualToolId = toolId || workflowName || workflowId;
    if (actualToolId === 'llm-prompt' || actualToolId === 'ai-prompt') {
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
              { id: Math.random().toString(36).slice(2), role: 'user', content: inputs.input || JSON.stringify(inputs) }
            ]
          }),
        });
        
        if (!fetchRes.ok) {
           const errText = await fetchRes.text();
           return NextResponse.json({ error: `AI Error: ${fetchRes.status} ${errText}` }, { status: 500 });
        }

        const text = await fetchRes.text(); 
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

        if (cleanText === '' && text.length > 0) {
           cleanText = text;
        }

        return NextResponse.json({ 
          success: true, 
          result: { response: cleanText, data: cleanText } 
        });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'LLM execution failed' }, { status: 500 });
      }
    }

    // 3. Match against registered backend tools in tools.ts
    const toolDef = tools[actualToolId as keyof typeof tools];
    if (toolDef) {
      let parsedInputs = inputs;
      if (toolDef.inputSchema) {
        try {
          parsedInputs = (toolDef.inputSchema as any).parse(inputs);
        } catch (e: any) {
          return NextResponse.json({ error: `Validation Error: ${e.message}` }, { status: 400 });
        }
      }

      if (!toolDef.execute) {
        return NextResponse.json({ error: `Tool ${actualToolId} has no execute function` }, { status: 400 });
      }
      
      const result = await toolDef.execute(parsedInputs, {
        toolCallId: 'workflow-call',
        messages: []
      } as any);

      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ 
      error: `Workflow or tool "${targetIdentifier}" not found` 
    }, { status: 404 });

  } catch (error: any) {
    console.error('Workflow tool execution failed:', error);
    return NextResponse.json({ error: error.message || 'Internal execution error' }, { status: 500 });
  }
}

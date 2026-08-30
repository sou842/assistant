import { NextResponse } from 'next/server';
import { tools } from '@/app/api/chat/tools';
import dbConnect from '@/lib/mongodb';
import Workflow from '@/lib/models/Workflow';
import { auth } from '@/auth';
import mongoose from 'mongoose';

function createServerBrowser() {
  const createPage = (initialUrl?: string) => {
    let currentUrl = initialUrl || '';
    let pageHtml = '';

    const fetchPage = async (url: string) => {
      currentUrl = url;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });
        pageHtml = await res.text();
      } catch (err: any) {
        pageHtml = `<html><body>Fetch failed: ${err.message}</body></html>`;
      }
      return pageHtml;
    };

    if (initialUrl) {
      fetchPage(initialUrl);
    }

    const locator = (selector: string) => ({
      click: async () => {},
      waitFor: async () => {},
      fill: async () => {},
      getAttribute: async (attr: string) => {
        if (!pageHtml && currentUrl) await fetchPage(currentUrl);
        const match = new RegExp(`${attr}=["']([^"']+)["']`, 'i').exec(pageHtml);
        return match ? match[1] : null;
      },
      textContent: async () => {
        if (!pageHtml && currentUrl) await fetchPage(currentUrl);
        return pageHtml
          .replace(/<script\b[^<]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style\b[^<]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      },
      inputValue: async () => ''
    });

    const pageObj = {
      locator,
      close: async () => {},
      waitForTimeout: async (ms: number) => new Promise(res => setTimeout(res, ms)),
      evaluate: async (fn: any, ...args: any[]) => {
        if (!pageHtml && currentUrl) await fetchPage(currentUrl);
        if (typeof fn === 'function') {
          try { return fn(...args); } catch(e) { return null; }
        }
        return null;
      },
      keyboard: {
        press: async () => {}
      },
      url: () => currentUrl,
      content: async () => {
        if (!pageHtml && currentUrl) await fetchPage(currentUrl);
        return pageHtml;
      }
    };

    return pageObj;
  };

  return {
    newPage: async (url?: string) => {
      const page = createPage(url);
      if (url) await page.content();
      return page;
    },
    getPage: async (urlPattern?: string) => {
      return createPage(urlPattern);
    }
  };
}

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
      const targetId = workflowId || (workflowName && mongoose.Types.ObjectId.isValid(workflowName) ? workflowName : null);
      if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
        if (workflowName && !workflowId) {
          const escaped = workflowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          query = {
            $or: [
              { _id: targetId },
              { title: { $regex: new RegExp(`^${escaped}$`, 'i') } }
            ]
          };
        } else {
          query = { _id: targetId };
        }
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
        // Resolve input variables with defaults and intelligent aliases
        const resolvedInputs: Record<string, any> = {};
        if (Array.isArray(workflow.inputs)) {
          for (const inp of workflow.inputs) {
            if (inp && inp.name) {
              resolvedInputs[inp.name] = inp.defaultValue !== undefined ? inp.defaultValue : '';
            }
          }
        }

        let passedInputs: Record<string, any> = {};
        if (typeof inputs === 'string') {
          passedInputs = { input: inputs, url: inputs, query: inputs, search_query: inputs, channel_url: inputs };
        } else if (inputs && typeof inputs === 'object') {
          passedInputs = { ...inputs };
        }

        const mergedInputs = { ...resolvedInputs, ...passedInputs };

        // If user passed a single input like { input: "val" } and workflow expects a named input
        if (passedInputs.input !== undefined) {
          if (Array.isArray(workflow.inputs)) {
            for (const inp of workflow.inputs) {
              if (inp && inp.name && (mergedInputs[inp.name] === '' || mergedInputs[inp.name] === undefined)) {
                mergedInputs[inp.name] = passedInputs.input;
              }
            }
          }
          if (!mergedInputs.url) mergedInputs.url = passedInputs.input;
          if (!mergedInputs.channel_url) mergedInputs.channel_url = passedInputs.input;
          if (!mergedInputs.query) mergedInputs.query = passedInputs.input;
        }

        if (body.fetchOnly) {
          return NextResponse.json({ 
            success: true, 
            workflowId: workflow._id,
            workflowTitle: workflow.title,
            workflowScript: workflow.script,
            resolvedInputs: mergedInputs,
          });
        }

        if (workflow.script) {
          try {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            let runnerCode = workflow.script;
            if (/async\s+function\s+workflow\b/.test(runnerCode) || /function\s+workflow\b/.test(runnerCode)) {
              runnerCode += "\nreturn await workflow(browser, __inputs);";
            } else if (/async\s+function\s+main\b/.test(runnerCode) || /function\s+main\b/.test(runnerCode)) {
              runnerCode += "\nreturn await main(browser, __inputs);";
            }

            const runner = new AsyncFunction('browser', '__inputs', 'inputs', 'tools', `
              try {
                ${runnerCode}
                return { success: true, message: "Workflow executed successfully", data: __inputs };
              } catch (e) {
                return { success: false, error: e.message };
              }
            `);

            const serverBrowser = createServerBrowser();
            const executionResult = await runner(serverBrowser, mergedInputs, mergedInputs, tools);
            return NextResponse.json({ 
              success: true, 
              workflowId: workflow._id,
              workflowTitle: workflow.title,
              workflowScript: workflow.script,
              resolvedInputs: mergedInputs,
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

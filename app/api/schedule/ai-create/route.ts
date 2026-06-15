import { NextResponse } from 'next/server';
import { createMistral } from '@ai-sdk/mistral';
import { generateObject } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_BASE_URL,
});

const stepSchema = z.object({
  id: z.string().describe("A unique string ID for this step, like 'step1' or 'fetch_weather'"),
  type: z.enum(['fetch_weather', 'ai_prompt', 'send_email', 'send_whatsapp']),
  config: z.object({
    city: z.string().optional(),
    prompt: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
    bodyTemplate: z.string().optional().describe("Use {{context.stepId.key}} to inject previous outputs"),
    phone: z.string().optional(),
    messageTemplate: z.string().optional().describe("Use {{context.stepId.key}} to inject previous outputs"),
  })
});

const schema = z.object({
  title: z.string(),
  steps: z.array(stepSchema).min(1),
  scheduleType: z.enum(['one_time', 'recurring']),
  runAt: z.string().optional(),
  intervalMinutes: z.number().optional(),
  timezone: z.string().default('Asia/Kolkata'),
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const now = new Date();

    const result = await generateObject({
      model: mistral('mistral-small-latest'),
      schema,
      prompt: `Convert user request into a multi-step schedule task JSON.
Date now: ${now.toISOString()}.
Rules:
- Phone must include country code digits only.
- For "every hour", use recurring + intervalMinutes=60.
- For one-time reminder like tomorrow 9am, fill runAt in ISO format.
- Break down the request into steps (e.g. fetch_weather -> ai_prompt -> send_email).
- Pass data between steps using template variables like {{context.fetch_weather.temperature}}.
- Step Types available: fetch_weather, ai_prompt, send_email, send_whatsapp.
User input: ${prompt}`,
    });

    // Ensure steps have unique IDs if missing
    const data = result.object;
    data.steps = data.steps.map(s => ({
      ...s,
      id: s.id || uuidv4(),
    }));

    const validationError = validateWorkflowSteps(data.steps);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 422 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function validateWorkflowSteps(steps: any[]): string | null {
  const stepIds = new Set<string>();
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    if (step.condition) {
      const refs = findContextReferences(step.condition);
      for (const ref of refs) {
        if (!stepIds.has(ref)) {
          return `Step "${step.id}" references an invalid or future step ID "${ref}" in its condition.`;
        }
      }
    }
    
    const configStr = JSON.stringify(step.config || {});
    const templateRefs = findTemplateReferences(configStr);
    for (const ref of templateRefs) {
      if (!stepIds.has(ref)) {
        return `Step "${step.id}" references an invalid or future step ID "${ref}" in its config.`;
      }
    }
    
    stepIds.add(step.id);
  }
  
  return null;
}

function findContextReferences(expr: string): string[] {
  const refs: string[] = [];
  const regex = /context\.([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = regex.exec(expr)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function findTemplateReferences(str: string): string[] {
  const refs: string[] = [];
  const regex = /\{\{\s*(?:context\.)?([a-zA-Z0-9_-]+)(?:\.[^}]+)?\s*\}\}/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}


import { NextResponse } from 'next/server';
import { createMistral } from '@ai-sdk/mistral';
import { generateObject } from 'ai';
import { z } from 'zod';

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_BASE_URL,
});

const schema = z.object({
  title: z.string(),
  actionType: z.enum(['weather_report', 'reminder']),
  payload: z.object({
    phone: z.string(),
    message: z.string().optional(),
    city: z.string().optional(),
    messagePrefix: z.string().optional(),
  }),
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
      prompt: `Convert user request into one schedule task JSON.
Date now: ${now.toISOString()}.
Rules:
- Phone must include country code digits only.
- For "every hour", use recurring + intervalMinutes=60.
- For one-time reminder like tomorrow 9am, fill runAt in ISO format.
- Use actionType weather_report if user asks weather report; otherwise reminder.
User input: ${prompt}`,
    });

    return NextResponse.json({ success: true, data: result.object });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

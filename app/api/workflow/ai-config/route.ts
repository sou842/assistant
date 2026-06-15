import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { auth } from '@/auth';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_BASE_URL,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, currentConfig, toolName } = await req.json();

    const systemPrompt = `You are an AI assistant helping a user configure a workflow tool called "${toolName}". 
The current JSON configuration for this tool is:
${JSON.stringify(currentConfig, null, 2)}

The user wants to modify this configuration. Their request is: "${prompt}"

Your job is to apply the user's modifications to the current configuration and return the completely updated JSON object.
Rules:
- Preserve existing fields that the user didn't ask to change.
- Modify or add fields as requested.
- Return ONLY the raw JSON object. No markdown, no backticks, no explanations.`;

    let text;
    try {
      // Primary: Mistral Large
      const response = await generateText({
        model: mistral('pixtral-large-latest'),
        prompt: systemPrompt,
      });
      text = response.text;
    } catch (mistralError) {
      console.warn("Mistral failed, falling back to Gemini:", mistralError);
      // Fallback: Gemini Flash
      const response = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: systemPrompt,
      });
      text = response.text;
    }

    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response: " + text);
    }
    
    const newConfig = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, config: newConfig });
  } catch (error: any) {
    console.error("AI Config Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

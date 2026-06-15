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

    const { prompt, currentSteps } = await req.json();

    const systemPrompt = `You are an AI assistant managing a workflow consisting of multiple sequential steps.
The current steps array in JSON format is:
${JSON.stringify(currentSteps, null, 2)}

The user wants to modify this workflow globally. Their request is: "${prompt}"

Your job is to apply the user's modifications to the current steps array and return the completely updated JSON array of steps.
Rules:
- Preserve existing fields and steps that the user didn't ask to change.
- Modify the configuration of steps as requested across the entire array.
- Return ONLY the raw JSON array. No markdown, no backticks, no explanations. Must start with '[' and end with ']'.`;

    let text;
    try {
      // Primary: Mistral Large
      const response = await generateText({
        model: mistral('mistral-large-latest'), // Using mistral-large-latest as pixtral-large-latest isn't standard
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

    // Robust JSON extraction for arrays
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON array from AI response: " + text);
    }
    
    const newSteps = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(newSteps)) {
      throw new Error("AI did not return a valid array of steps.");
    }

    return NextResponse.json({ success: true, steps: newSteps });
  } catch (error: any) {
    console.error("AI Global Config Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

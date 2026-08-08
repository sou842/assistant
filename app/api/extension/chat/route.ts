import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { auth } from '@/auth';

const mistralApiKeys = (process.env.MISTRAL_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const mistralProviders = mistralApiKeys.map(key => 
  createMistral({
    apiKey: key,
    baseURL: process.env.MISTRAL_BASE_URL,
  })
);

const openaiKey = (process.env.OPENAI_API_KEY || '').split(',')[0]?.trim();
const openai = createOpenAI({
  apiKey: openaiKey,
});

const geminiKey = (process.env.GEMINI_API_KEY || '').split(',')[0]?.trim();
const google = createGoogleGenerativeAI({
  apiKey: geminiKey,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { model, systemInstruction, customModelName, customApiToken, allowFallback = true } = await req.json();

    if (!model || !systemInstruction) {
      return NextResponse.json({ error: 'Missing model or systemInstruction' }, { status: 400 });
    }

    let customModelInstance: any = null;
    if (customModelName && customApiToken) {
      try {
        if (customModelName.startsWith("openrouter/") || customModelName.includes("/")) {
          const modelId = customModelName.replace(/^openrouter\//, "");
          const customOpenRouter = createOpenAI({
            apiKey: customApiToken,
            baseURL: "https://openrouter.ai/api/v1",
          });
          customModelInstance = customOpenRouter(modelId);
        } else if (customModelName.startsWith("gemini")) {
          const customGoogle = createGoogleGenerativeAI({ apiKey: customApiToken });
          customModelInstance = customGoogle(customModelName);
        } else if (customModelName.startsWith("mistral")) {
          const customMistral = createMistral({ apiKey: customApiToken });
          customModelInstance = customMistral(customModelName);
        } else {
          const customOpenAI = createOpenAI({ apiKey: customApiToken });
          customModelInstance = customOpenAI(customModelName);
        }
      } catch (err) {
        console.error("Error creating custom model provider:", err);
      }
    }

    const isGemini = model.startsWith("gemini");
    const isOpenAI = model.startsWith("gpt");
    const isMistral = model.startsWith("mistral");

    let modelsToTry: any[] = [];

    if (customModelInstance) {
      modelsToTry.push(customModelInstance);
    }

    // Only populate default fallbacks if fallback is allowed or if no custom model is defined
    if (!customModelInstance || allowFallback) {
      if (isGemini) {
        modelsToTry.push(
          google(model),
          openai("gpt-4o-mini"),
          ...mistralProviders.map(p => p("mistral-small-latest"))
        );
      } else if (isOpenAI) {
        modelsToTry.push(
          openai(model),
          google("gemini-2.5-flash"),
          ...mistralProviders.map(p => p("mistral-small-latest"))
        );
      } else if (isMistral) {
        modelsToTry.push(
          ...mistralProviders.map(p => p(model)),
          google("gemini-2.5-flash"),
          openai("gpt-4o-mini")
        );
      } else {
        if (!customModelInstance) {
          return NextResponse.json({ error: `Unsupported model: ${model}` }, { status: 400 });
        }
      }
    }

    modelsToTry = modelsToTry.filter(Boolean);

    let lastError: any;
    let text = "";
    let usage: any;

    for (let i = 0; i < modelsToTry.length; i++) {
      try {
        const currentModel = modelsToTry[i];
        
        // We need to determine the format dynamically for the current model in the loop
        // If we fall back to Gemini, we need responseMimeType
        const isCurrentGemini = currentModel.provider === 'google.generative-ai' || currentModel.modelId?.startsWith('gemini');
        
        const result = await generateText({
          model: currentModel,
          prompt: systemInstruction,
          ...(isCurrentGemini ? {
            responseMimeType: "application/json",
          } : {
            responseFormat: { type: "json_object" }
          }),
        });
        
        text = result.text;
        usage = result.usage;
        lastError = null; // Success!
        break; 
      } catch (err: any) {
        console.warn(`[Extension Fallback] Model attempt ${i + 1}/${modelsToTry.length} failed:`, err.message || err);
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      const match = cleanedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (match && match[1]) {
        cleanedText = match[1].trim();
      }
    }

    return NextResponse.json({
      text: cleanedText,
      promptTokens: usage?.promptTokens ?? usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completionTokens ?? usage?.completion_tokens ?? 0,
      totalTokens: usage?.totalTokens ?? usage?.total_tokens ?? 0,
    });
  } catch (error: any) {
    console.error("Extension proxy API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

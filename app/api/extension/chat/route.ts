import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_BASE_URL,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { model, systemInstruction } = await req.json();

    if (!model || !systemInstruction) {
      return NextResponse.json({ error: 'Missing model or systemInstruction' }, { status: 400 });
    }

    const isGemini = model.startsWith("gemini");
    const isOpenAI = model.startsWith("gpt");
    const isMistral = model.startsWith("mistral");

    let providerModel;
    if (isGemini) {
      providerModel = google(model);
    } else if (isOpenAI) {
      providerModel = openai(model);
    } else if (isMistral) {
      providerModel = mistral(model);
    } else {
      return NextResponse.json({ error: `Unsupported model: ${model}` }, { status: 400 });
    }

    const { text, usage } = await generateText({
      model: providerModel,
      prompt: systemInstruction,
      ...(isGemini ? {
        responseMimeType: "application/json",
      } : {}),
      ...(isOpenAI || isMistral ? {
        responseFormat: { type: "json_object" }
      } : {}),
    });

    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      const match = cleanedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (match && match[1]) {
        cleanedText = match[1].trim();
      }
    }

    return NextResponse.json({
      text: cleanedText,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });
  } catch (error: any) {
    console.error("Extension proxy API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

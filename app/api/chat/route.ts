import { auth } from '@/auth';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, generateObject } from 'ai';
import { formatMemoriesForPrompt } from '@/lib/memory-storage';
import { getMessageText } from '@/lib/ai/message-utils';
import { renderSystemPrompt } from '@/lib/ai/prompts';
import { tools } from './tools';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';
import LlmCall from '@/lib/models/LlmCall';
import mongoose from 'mongoose';
import User from '@/lib/models/User';


// Allow streaming responses
export const maxDuration = 260;

const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let attempts = 0;
  const maxAttempts = 2;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await fetch(url, init);
      if (response.status === 429 && attempts < maxAttempts) {
        const delay = attempts * 1500;
        console.warn(`Rate limited (429) on ${url}. Retrying attempt ${attempts}/${maxAttempts} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (err) {
      if (attempts >= maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return fetch(url, init);
};

const mistralApiKeys = (process.env.MISTRAL_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

if (mistralApiKeys.length === 0) {
  mistralApiKeys.push('dummy_key');
}

const mistralProviders = mistralApiKeys.map(key => 
  createMistral({
    apiKey: key,
    baseURL: process.env.MISTRAL_BASE_URL,
    fetch: customFetch,
  })
);

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: customFetch,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  fetch: customFetch,
});

const chatRequestSchema = z.object({
  chatId: z.string().optional(),
  model: z.string().optional(),
  skipSave: z.boolean().optional(),
  memories: z.array(z.object({
    title: z.string(),
    content: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
  })).optional(),
  messages: z.array(z.custom<UIMessage>()).min(1),
  systemPrompt: z.string().optional(),
  customAttachments: z.array(z.object({
    id: z.string().optional(),
    filename: z.string().optional(),
    name: z.string().optional(),
    mediaType: z.string().optional(),
    contentType: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    size: z.any().optional(),
  })).optional(),
  browserExtensionConnected: z.boolean().optional(),
});

const ALLOWED_MODELS = new Set([
  'mistral-small-latest',
  'mistral-large-latest',
  'gemini-2.5-flash',
  'codestral-latest',
  'gpt-4o-mini',
]);

const withFallback = (models: any[]): any => {
  const primary = models[0];
  return {
    ...primary,
    async doGenerate(options: any) {
      let lastError;
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        try {
          return await currentModel.doGenerate(options);
        } catch (error: any) {
          if (error?.name === 'AbortError') throw error;
          console.warn(`[Fallback] Model ${currentModel?.modelId || 'unknown'} (instance ${i + 1}/${models.length}) failed...`, error?.message || error);
          lastError = error;
        }
      }
      throw lastError;
    },
    async doStream(options: any) {
      let lastError;
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        try {
          return await currentModel.doStream(options);
        } catch (error: any) {
          if (error?.name === 'AbortError') throw error;
          console.warn(`[Fallback] Model ${currentModel?.modelId || 'unknown'} (instance ${i + 1}/${models.length}) streaming failed...`, error?.message || error);
          lastError = error;
        }
      }
      throw lastError;
    }
  };
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userName = session?.user?.name || "the user";
    const userEmail = session?.user?.email || "unknown";

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'assistant-nine-ecru.vercel.app';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    const parsed = chatRequestSchema.safeParse(await req.json());

    if (!parsed.success) {
      return new Response('Invalid request payload', { status: 400 });
    }

    const { messages, chatId, memories = [], model: requestedModel, systemPrompt: clientSystemPrompt, browserExtensionConnected, skipSave } = parsed.data;

    const validChatId = chatId;

    const model = requestedModel && ALLOWED_MODELS.has(requestedModel)
      ? requestedModel
      : 'mistral-large-latest';

    const isMistral = model !== 'gpt-4o-mini' && model !== 'gemini-2.5-flash';

    let canPersist = false;
    let integrationContext = "You do not currently know the user's connected apps status.";
    try {
      await dbConnect();
      canPersist = true;
      if (userEmail !== "unknown") {
        const user = await User.findOne({ email: userEmail });
        if (user) {
          const connectedApps = [];
          if (user.githubAccessToken) connectedApps.push("GitHub");
          if (user.googleRefreshToken) connectedApps.push("Google");
          if (user.leetcodeUsername) connectedApps.push(`LeetCode (Username: ${user.leetcodeUsername})`);
          if (user.telegramChatId) connectedApps.push(`Telegram (Chat ID: ${user.telegramChatId})`);
          if (user.devtoApiKey) connectedApps.push(`Dev.to`);
          if (user.notionAccessToken) connectedApps.push(`Notion`);
          
          if (connectedApps.length > 0) {
            integrationContext = `The user currently has the following apps integrated: ${connectedApps.join(", ")}.`;
          } else {
            integrationContext = `The user currently has no apps integrated.`;
          }
        }
      }
    } catch (dbConnectError) {
      console.warn('MongoDB unavailable, continuing without persistence:', dbConnectError);
    }

    let attachedFilesContext = "";
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMessage) {
      const nativeAttachments = (lastUserMessage as any).experimental_attachments || (lastUserMessage as any).attachments || [];
      const attachments = [
        ...nativeAttachments,
        ...(parsed.data.customAttachments || [])
      ];
      if (attachments.length > 0) {
        attachedFilesContext = `The user has attached the following files to their current request:\n` +
          attachments.map((att: any, idx: number) => {
            const filename = att.name || att.filename || `File-${idx}`;
            const url = att.url || "";
            const mediaType = att.contentType || att.type || att.mediaType || "image/jpeg";
            const size = att.size || 0;
            const id = att.id || `media-${Math.random().toString(36).substr(2, 9)}`;
            return `- File #${idx + 1}: ID="${id}", Name="${filename}", URL="${url}", Type="${mediaType}", Size=${size}`;
          }).join("\n") + `\n\nWhen the user asks to "create an album with these images" (or similar), use these files as the content of the new gallery/album vault item. For each item in the content array, you MUST populate id, filename, url, mediaType, and size exactly as provided above.`;
      }
    }

    const memoryContext = formatMemoriesForPrompt(memories);
    const now = new Date();
    const currentTimeContext = `${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata). Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}`;

    const systemPrompt = renderSystemPrompt({
      baseUrl,
      userName,
      userEmail,
      currentTimeContext,
      browserExtensionConnected: !!browserExtensionConnected,
      memoryContext,
      attachedFilesContext: attachedFilesContext || '',
      integrationContext: integrationContext || '',
    });

    const finalSystemPrompt = clientSystemPrompt
      ? `${systemPrompt}\n\nAdditional Context:\n${clientSystemPrompt}`
      : systemPrompt;

    // console.log(finalSystemPrompt, 'real prompt')

    // console.log(clientSystemPrompt, finalSystemPrompt, "tara")

    const normalizedMessages = (messages || []).map((m: any) => ({
      ...m,
      parts: m.parts || [{ type: 'text', text: String(m.content || '') }]
    }));
    const modelMessages = await convertToModelMessages(normalizedMessages);

    const stepsLogged: any[] = [];

    // Pre-Routing Logic for Dynamic Tool Discovery (Smart Mode)
    const toolNames = Object.keys(tools) as [string, ...string[]];
    let activeToolNames: string[] = ['saveMemory', 'getWeather', 'getTime', 'callApi', 'browserControl', 'webSearch']; // Base tools always included
    
    // Always include studio tools if we are in the studio context
    if (finalSystemPrompt.includes("CURRENT WORKSPACE CONTEXT") || finalSystemPrompt.includes("Studio Workspaces")) {
      activeToolNames.push('updateStudioDocument', 'updateStudioFile', 'editStudioDocumentSection', 'createStudioDocument', 'loadDesignSystem', 'listWorkflows');
    } else if (finalSystemPrompt.includes("CURRENT ITEM CONTEXT")) {
      activeToolNames.push('updateStudioDocument', 'updateStudioFile', 'editStudioDocumentSection', 'loadDesignSystem', 'listWorkflows');
    }
    
    try {
      const recentMessagesText = messages.slice(-3).map((m: any) => `${m.role}: ${getMessageText(m)}`).join("\n");
      const routingModelId = model === 'gpt-4o-mini' ? 'gpt-4o-mini' : model === 'gemini-2.5-flash' ? 'gemini-2.5-flash' : 'mistral-small-latest';
      
      const availableToolsContext = Object.entries(tools)
        .map(([name, tool]) => `- ${name}: ${(tool as any).description || 'No description available'}`)
        .join('\n');
 
      const { object } = await generateObject({
        model: model === 'gpt-4o-mini' ? openai(routingModelId) : model === 'gemini-2.5-flash' ? google(routingModelId) : withFallback([...mistralProviders.map(p => p(routingModelId)), google('gemini-2.5-flash')]),
        schema: z.object({
          selectedTools: z.array(z.enum(toolNames)).describe("The specific tools needed to answer the user's request. Pick only what is strictly necessary.")
        }),
        prompt: `You are an intelligent tool router. Your job is to analyze the user's latest request and select the necessary tools to fulfill it. Pay special attention to any system instructions that mandate specific tools.\n\nSystem Context:\n${finalSystemPrompt}\n\nAvailable tools:\n${availableToolsContext}\n\nRecent conversation:\n${recentMessagesText}`,
      });
      
      activeToolNames = Array.from(new Set([...activeToolNames, ...object.selectedTools]));
      
      // Auto-include read/list tools if any vault tool is selected to allow multi-step fetches
      const vaultTools = ['listVaultItems', 'getVaultItem', 'createVaultItem', 'updateVaultItem', 'deleteVaultItem', 'getVaultNoteGuidelines', 'getVaultSheetGuidelines', 'getVaultAlbumGuidelines'];
      if (activeToolNames.some(t => vaultTools.includes(t))) {
        activeToolNames.push('listVaultItems', 'getVaultItem');
      }

      // Auto-include all schedule tools if any schedule tool or guidelines are selected to support multi-step workflows
      const scheduleTools = ['createScheduleTask', 'updateScheduleTask', 'listScheduleTasks', 'deleteScheduleTask', 'getSchedulerGuidelines'];
      if (activeToolNames.some(t => scheduleTools.includes(t))) {
        activeToolNames.push(...scheduleTools);
      }

      activeToolNames = Array.from(new Set(activeToolNames));
      if (finalSystemPrompt.includes("CURRENT WORKSPACE CONTEXT")) {
        activeToolNames.push('updateStudioDocument', 'updateStudioFile', 'editStudioDocumentSection');
      }
      
      console.log('Dynamic Tools Selected (Smart):', activeToolNames);
    } catch (e) {
      console.warn('Pre-routing failed, falling back to all tools', e);
      activeToolNames = Object.keys(tools);
    }

    const activeTools: Record<string, any> = {};
    for (const toolName of activeToolNames) {
      if ((tools as any)[toolName]) {
        activeTools[toolName] = (tools as any)[toolName];
      }
    }

    const activeModel = model === 'gpt-4o-mini' 
      ? openai(model) 
      : model === 'gemini-2.5-flash' 
        ? google(model) 
        : withFallback([...mistralProviders.map(p => p(model)), google('gemini-2.5-flash')]);

    const result = streamText({
      model: activeModel,
      messages: modelMessages.length > 0 ? modelMessages : [{ role: 'user', content: ' ' }],
      system: finalSystemPrompt,
      tools: activeTools,
      stopWhen: stepCountIs(20),
      onStepFinish: (step) => {
        console.log('\n--- Step Finished ---', step);
        stepsLogged.push(step);
      },
      onFinish: async ({ text, toolResults, toolCalls, usage }) => {
        if (!canPersist) {
          return;
        }

        try {
          const dbMessages = (messages || []).map((m: any) => ({
            role: m.role,
            content: getMessageText(m as any).trim() || m.content || '',
            toolInvocations: m.toolInvocations || [],
          }));

          let finalContent = text;
          if (!finalContent && toolCalls?.some(tc => tc.toolName === 'browserControl')) {
            finalContent = "I have forwarded your request to the browser agent.";
          }

          const assistantMessage = {
            role: 'assistant',
            content: finalContent,
            toolInvocations: toolResults?.map(result => ({
              ...result,
              state: 'result' as const,
            })) || []
          };
          dbMessages.push(assistantMessage);

          if (!skipSave) {
            if (validChatId) {
              await Chat.findByIdAndUpdate(validChatId, {
                $set: { messages: dbMessages },
                $setOnInsert: {
                  title: `${dbMessages[0]?.content?.slice(0, 50) || 'New Chat'}...`,
                  ...(session?.user?.id ? { userId: session.user.id } : {})
                }
              }, { upsert: true });
            } else {
              // Fallback for safety, though validChatId should be present
              await Chat.create({
                title: `${dbMessages[0]?.content?.slice(0, 50) || 'New Chat'}...`,
                messages: dbMessages,
                ...(session?.user?.id ? { userId: session.user.id } : {})
              });
            }
          }

          // Save LLM Call Log
          const userId = session?.user?.id && mongoose.Types.ObjectId.isValid(session.user.id)
            ? new mongoose.Types.ObjectId(session.user.id)
            : undefined;

          await LlmCall.create({
            userId,
            userName,
            userEmail,
            chatId: validChatId,
            modelName: model,
            systemPrompt: finalSystemPrompt,
            messagesCount: messages?.length || 0,
            steps: stepsLogged,
            promptTokens: usage?.inputTokens || 0,
            completionTokens: usage?.outputTokens || 0,
            totalTokens: usage?.totalTokens || 0,
          });
        } catch (dbError) {
          console.error('Failed to persist chat or LLM call to MongoDB:', dbError);
          // We don't throw here as the stream response is already being handled
        }
      },
    });

    return result.toUIMessageStreamResponse({ sendUsage: true } as any);
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('An unexpected error occurred', { status: 500 });
  }
}

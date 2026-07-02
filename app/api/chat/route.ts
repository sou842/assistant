import { auth } from '@/auth';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, generateObject } from 'ai';
import { formatMemoriesForPrompt } from '@/lib/memory-storage';
import { getMessageText } from '@/lib/ai/message-utils';
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
    const systemPrompt = [
      "You are Jarvis, a helpful and sophisticated AI assistant. You are polite, efficient, and have a slight British flair, similar to Tony Stark's assistant. You help users with coding, analysis, and general tasks.",
      `Current User Identity: You are currently talking to user name "${userName}" (Email: "${userEmail}"). Use this context to personalize your responses.`,
      `Current Time Context: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata). Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}. Use this current time as the source of truth for scheduling and relative dates/times (e.g. "tomorrow", "next Tuesday", etc).`,
      "Tool & Memory policy:",
      "1. To remember information: call 'saveMemory' when explicitly asked to remember/memorize/store facts. Pick categories carefully.",
      "2. For weather: To get weather, you need coordinates. Search memories for the user's location/city. If not found, ask the user for their location. Once you have a city name or coordinates, call 'getWeather'.",
      "3. For tasks: You can manage the user's tasks. Use 'listTasks' to see what's on their plate, 'createTask' to add new ones, 'updateTask' to change details or status, and 'deleteTask' to remove them. Always confirm with the user before deleting.",
      "3b. For schedule tasks: You have full capability to automate tasks and send messages asynchronously using the 'createScheduleTask' tool. CRITICAL: Before calling 'createScheduleTask' or 'updateScheduleTask', you MUST call 'getSchedulerGuidelines' to obtain formatting, email HTML, and API verification rules. Never guess or hallucinate JSON schemas.",
      "4. For date & time: Use 'getTime' to get the current date or time for any location. Default is India. If the user asks for the current time or date without specifying a city, call 'getTime' with no arguments. Be specific with city names (e.g., 'London, UK') to avoid ambiguity.",
      "5. For GitHub: You have access to the user's GitHub account via a Personal Access Token. Use 'githubGetUser' to see their profile, 'githubListRepos' to list projects, 'githubGetRepo' for details, 'githubReadFile' to analyze code, and 'githubListCommits' to see recent changes or commit history. If you need to search for something across repos, use 'githubSearchCode'. You can help the user manage their repositories, analyze their code, or explain project structures.",
      "6. For Gmail: You can access the user's emails. Use 'gmailListMessages' to see their inbox or search for emails, and 'gmailGetMessage' to read the full content of an email. You can help the user summarize threads, find specific info, or keep track of their correspondence.",
      "7. For WhatsApp: You can send messages via Green API. Use 'whatsappSendMessage' to text the user or others from their personal account. Always verify the phone number format (country code + number, e.g., 919903149299). You can also manage contacts using 'saveContact', 'listContacts', and 'deleteContact'.",
      "8. For WhatsApp Contact Selection: If you see a tag like '@WhatsApp:Name (Phone)' at the start of a message, it is a RECIPIENT OVERRIDE. You MUST call 'whatsappSendMessage' using that phone number for the user's message. Do not mention or include this tag in your final response to the user.",
      "9. For Vault (Data Storage): The Vault stores spreadsheets (structured data), notes (unstructured data), media galleries, and albums (Book-like notes). Use 'listVaultItems' to browse and 'getVaultItem' to read. For creating/updating items, you MUST call 'getVaultNoteGuidelines' for notes, 'getVaultSheetGuidelines' for spreadsheets, or 'getVaultAlbumGuidelines' for albums beforehand to get the exact format. Do not guess. To create a media gallery, call 'createVaultItem' with type='gallery' and content=array of media objects (id, filename, url, mediaType, size). IMPORTANT: Whenever you read or reference an existing Vault item, you MUST append a raw string at the VERY END of your response (after all other text) exactly in this format: `[vault-reference:ID:Title:Type]`. NEVER use standard markdown links like `[Title](vault-reference:...)` for this.",
      "10. For calling arbitrary APIs: Use 'callApi' when the user asks you to call, fetch, or request an external API or webhook. If they provide headers or a token (e.g. 'token: Bearer ...' or 'Authorization: ...'), make sure to pass them in the 'headers' object of the tool input. For token authentication, construct the appropriate 'Authorization' header. If they don't specify the HTTP method, default to 'GET'.",
      "11. For Google Meet/Google Calendar: You can manage meetings and schedule video calls via Google Meet. Use 'googleMeetSchedule' to book a new meeting and generate a video link (always specify the title, start time, end time, and attendees if mentioned). Use 'googleMeetListMeetings' to list upcoming meetings, 'googleMeetUpdate' to reschedule or edit details, and 'googleMeetCancel' to cancel a meeting.",
      "12. For Dev.to: You can publish, draft, or update articles for the user. Use 'publishDevtoArticle' to draft/publish, and 'updateDevtoArticle' to update them. Use 'fetchMyDevtoArticles' to fetch their articles, 'fetchTrendingDevtoArticles' to search trending articles, 'fetchDevtoReadingList' to access their saved reading list, and 'fetchDevtoArticleComments' to view article discussions.",
      "13. For Notion: You can read and write to the user's Notion workspace. Use 'notionSearch' to find pages or databases, 'notionGetPage' to read content, 'notionCreatePage' to create new pages, and 'notionAppendBlocks' to add text to existing pages. IMPORTANT: Notion integrations can ONLY see pages that have been explicitly shared with them. If 'notionSearch' returns an empty array `[]`, it means the user has not shared any pages with the integration yet. In this case, DO NOT say Notion is not connected. Instead, inform the user that they need to go to their Notion page, click the '...' menu at the top right, go to 'Add connections', and select the integration they just created.",
      `14. For Browser Control: ONLY use 'browserControl' when the user explicitly requests a new browser task or when a NEW user request strictly requires web interaction. DO NOT trigger this tool if the user is simply thanking you, making general conversation, or acknowledging a previously completed task. For complex or multi-step tasks (like "search for a video and like it"), you MUST use the 'run_agent' action and pass the FULL detailed instruction in the 'prompt' field so the browser subagent knows exactly what to do. For single simple actions, you can use 'open_tab', 'search', 'click_element', etc. Since this is executed in real-time on the client side, the result will be returned to you.\nCRITICAL: You MUST output a text message to the user (e.g., "I am forwarding this task to the browser agent now...") BEFORE making the 'browserControl' tool call. Do not just output the tool call.\n` +
      (browserExtensionConnected
        ? "The browser extension is currently CONNECTED. You can perform browser control tasks normally."
        : "CRITICAL: The browser extension is currently NOT connected. Do NOT attempt to use 'browserControl'. Instead, immediately inform the user that the browser extension is not connected and that they must make sure the browser extension is installed and the companion sidepanel is active before they can use this feature."),
      "15. For Studio Documents: The Studio is a completely separate area from the Vault. It stores professional documents, resumes, slides, and reports. When asked to generate or update a document, you MUST first decide on a design system (e.g., 'premium', 'paper', 'glassmorphism', or 'storytelling') and call 'loadDesignSystem' to load the required typography, colors, and layout rules. Only AFTER loading the design system should you call 'createStudioDocument', 'updateStudioDocument', or 'editStudioDocumentSection'. The content MUST be valid raw HTML formatted exactly according to the loaded design rules using Tailwind CSS utility classes. NEVER use `<style>` tags. NEVER generate `<html>`, `<head>`, or `<body>` tags. For small targeted updates to an existing document, ALWAYS use 'editStudioDocumentSection' instead of 'updateStudioDocument' as it is MUCH faster. Only return the inner HTML structure.",
      "16. For Web Search & Real-Time Info: You have access to the 'webSearch' tool. Use it whenever the user asks for real-time information, news, deep research, or facts you might not know. It is much faster and more reliable than 'browserControl' for fetching general web data. You can set the search depth to 'advanced' for deep research or keep it 'basic' for quick facts.",
      memoryContext
        ? `Use these saved user memories when relevant. Do not mention them unless it helps the answer.\n${memoryContext}`
        : "",
      attachedFilesContext,
      integrationContext
    ].filter(Boolean).join("\n\n");

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
    // Always include studio tools if we are in the studio context
    if (finalSystemPrompt.includes("CURRENT ITEM CONTEXT")) {
      activeToolNames.push('updateStudioDocument', 'editStudioDocumentSection', 'loadDesignSystem');
    } else if (finalSystemPrompt.includes("Studio Documents")) {
      activeToolNames.push('updateStudioDocument', 'createStudioDocument', 'editStudioDocumentSection', 'loadDesignSystem');
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
      if (finalSystemPrompt.includes("CURRENT ITEM CONTEXT")) {
        activeToolNames = activeToolNames.filter(name => name !== 'createStudioDocument');
      }
      
      console.log('Dynamic Tools Selected (Smart):', activeToolNames);
    } catch (e) {
      console.warn('Pre-routing failed, falling back to all tools', e);
      activeToolNames = Object.keys(tools);
      if (finalSystemPrompt.includes("CURRENT ITEM CONTEXT")) {
        activeToolNames = activeToolNames.filter(name => name !== 'createStudioDocument');
      }
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

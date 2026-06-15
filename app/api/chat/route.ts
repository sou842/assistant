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


// Allow streaming responses
export const maxDuration = 260;

const customFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let attempts = 0;
  const maxAttempts = 5;
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

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_BASE_URL,
  fetch: customFetch,
});

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

const withFallback = (primary: any, fallback: any): any => {
  return {
    ...primary,
    async doGenerate(options: any) {
      try {
        return await primary.doGenerate(options);
      } catch (error) {
        console.warn(`[Fallback] Primary model ${primary.modelId} failed, falling back to ${fallback.modelId}...`, error);
        return await fallback.doGenerate(options);
      }
    },
    async doStream(options: any) {
      try {
        return await primary.doStream(options);
      } catch (error) {
        console.warn(`[Fallback] Primary model ${primary.modelId} streaming failed, falling back to ${fallback.modelId}...`, error);
        return await fallback.doStream(options);
      }
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

    const { messages, chatId, memories = [], model: requestedModel, systemPrompt: clientSystemPrompt, browserExtensionConnected } = parsed.data;

    const validChatId = chatId;

    const model = requestedModel && ALLOWED_MODELS.has(requestedModel)
      ? requestedModel
      : 'mistral-large-latest';

    const provider = model === 'gpt-4o-mini'
      ? openai
      : model === 'gemini-2.5-flash'
        ? google
        : mistral;

    let canPersist = false;
    try {
      await dbConnect();
      canPersist = true;
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
      "3b. For schedule tasks: You HAVE FULL CAPABILITY to automate tasks and send messages asynchronously using the 'createScheduleTask' tool. NEVER say you cannot do this. CRUCIAL RULE FOR MODIFICATIONS: If the user asks to 'modify', 'edit', 'add to', or 'update' an existing scheduled task or workflow, YOU MUST call 'listScheduleTasks' first to find the correct task ID, and then call 'updateScheduleTask' to modify it. DO NOT call 'createScheduleTask' when modifying an existing task! Use 'createScheduleTask' ONLY when the user explicitly asks to create a brand new task. Use 'deleteScheduleTask' for deletion. Never claim create/update/delete succeeded unless the tool result returns success=true.",
      "4. For date & time: Use 'getTime' to get the current date or time for any location. Default is India. If the user asks for the current time or date without specifying a city, call 'getTime' with no arguments. Be specific with city names (e.g., 'London, UK') to avoid ambiguity.",
      "5. For GitHub: You have access to the user's GitHub account via a Personal Access Token. Use 'githubGetUser' to see their profile, 'githubListRepos' to list projects, 'githubGetRepo' for details, 'githubReadFile' to analyze code, and 'githubListCommits' to see recent changes or commit history. If you need to search for something across repos, use 'githubSearchCode'. You can help the user manage their repositories, analyze their code, or explain project structures.",
      "6. For Gmail: You can access the user's emails. Use 'gmailListMessages' to see their inbox or search for emails, and 'gmailGetMessage' to read the full content of an email. You can help the user summarize threads, find specific info, or keep track of their correspondence.",
      "7. For WhatsApp: You can send messages via Green API. Use 'whatsappSendMessage' to text the user or others from their personal account. Always verify the phone number format (country code + number, e.g., 919903149299). You can also manage contacts using 'saveContact', 'listContacts', and 'deleteContact'.",
      "8. For WhatsApp Contact Selection: If you see a tag like '@WhatsApp:Name (Phone)' at the start of a message, it is a RECIPIENT OVERRIDE. You MUST call 'whatsappSendMessage' using that phone number for the user's message. Do not mention or include this tag in your final response to the user.",
      "9. For Vault (Data Storage): The Vault stores spreadsheets (structured data), notes (unstructured data), and media galleries / albums. Use 'listVaultItems' to browse and 'getVaultItem' to read content. For creating/updating items, you MUST call 'getVaultNoteGuidelines' for notes OR 'getVaultSheetGuidelines' for spreadsheets beforehand to get the exact format. Do not use both at the same time. Always save spreadsheets, lists, notes, or media galleries / albums in the Vault when asked. To create a media gallery/album, call 'createVaultItem' with type='gallery' or type='album' and content=array of media objects (each having: id, filename, url, mediaType, size).",
      "10. For calling arbitrary APIs: Use 'callApi' when the user asks you to call, fetch, or request an external API or webhook. If they provide headers or a token (e.g. 'token: Bearer ...' or 'Authorization: ...'), make sure to pass them in the 'headers' object of the tool input. For token authentication, construct the appropriate 'Authorization' header. If they don't specify the HTTP method, default to 'GET'.",
      "11. For Google Meet/Google Calendar: You can manage meetings and schedule video calls via Google Meet. Use 'googleMeetSchedule' to book a new meeting and generate a video link (always specify the title, start time, end time, and attendees if mentioned). Use 'googleMeetListMeetings' to list upcoming meetings, 'googleMeetUpdate' to reschedule or edit details, and 'googleMeetCancel' to cancel a meeting.",
      `12. For Browser Control: Use 'browserControl' to automate browser tasks like opening tabs/websites, searching on Google/YouTube, clicking links/buttons, or running scripts. Since this is executed in real-time on the client side, you can run multiple actions sequentially across several steps to complete a task. If the user asks to 'open a website and open the first video', do NOT try to do it all at once; first call 'open_tab' with the website URL, wait for the result to return loaded, and then call 'click_element' or 'execute_script' to open the first video. For YouTube video elements, common selectors include 'ytd-rich-grid-media a#video-title-link, ytd-video-renderer a#video-title, #video-title, a[href*="\\/watch\\"]'. If unsure of selectors, run an 'execute_script' query to inspect or search the DOM.\n` +
      (browserExtensionConnected
        ? "The browser extension is currently CONNECTED. You can perform browser control tasks normally."
        : "CRITICAL: The browser extension is currently NOT connected. Do NOT attempt to use 'browserControl'. Instead, immediately inform the user that the browser extension is not connected and that they must make sure the browser extension is installed and the companion sidepanel is active before they can use this feature."),
      "13. For Studio Documents: The Studio is a completely separate area from the Vault. It stores professional documents, resumes, slides, and reports. When asked to generate or update a document, you MUST first decide on a design system (e.g., 'premium', 'paper', 'glassmorphism', or 'storytelling') and call 'loadDesignSystem' to load the required typography, colors, and layout rules. Only AFTER loading the design system should you call 'createStudioDocument', 'updateStudioDocument', or 'editStudioDocumentSection'. The content MUST be valid raw HTML formatted exactly according to the loaded design rules using Tailwind CSS utility classes. NEVER use `<style>` tags. NEVER generate `<html>`, `<head>`, or `<body>` tags. For small targeted updates to an existing document, ALWAYS use 'editStudioDocumentSection' instead of 'updateStudioDocument' as it is MUCH faster. Only return the inner HTML structure.",
      memoryContext
        ? `Use these saved user memories when relevant. Do not mention them unless it helps the answer.\n${memoryContext}`
        : "",
      attachedFilesContext
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
    let activeToolNames: string[] = ['saveMemory', 'getWeather', 'getTime', 'callApi', 'browserControl']; // Base tools always included
    
    // Always include studio tools if we are in the studio context
    // Always include studio tools if we are in the studio context
    if (finalSystemPrompt.includes("CURRENT ITEM CONTEXT")) {
      activeToolNames.push('updateStudioDocument', 'editStudioDocumentSection', 'loadDesignSystem');
    } else if (finalSystemPrompt.includes("Studio Documents")) {
      activeToolNames.push('updateStudioDocument', 'createStudioDocument', 'editStudioDocumentSection', 'loadDesignSystem');
    }
    
    try {
      const recentMessagesText = messages.slice(-3).map((m: any) => `${m.role}: ${getMessageText(m)}`).join("\n");
      const routingModelId = provider === openai ? 'gpt-4o-mini' : provider === google ? 'gemini-2.5-flash' : 'mistral-small-latest';
      
      const availableToolsContext = Object.entries(tools)
        .map(([name, tool]) => `- ${name}: ${(tool as any).description || 'No description available'}`)
        .join('\n');
 
      const { object } = await generateObject({
        model: provider(routingModelId),
        schema: z.object({
          selectedTools: z.array(z.enum(toolNames)).describe("The specific tools needed to answer the user's request. Pick only what is strictly necessary.")
        }),
        prompt: `You are an intelligent tool router. Your job is to analyze the user's latest request and select the necessary tools to fulfill it. Pay special attention to any system instructions that mandate specific tools.\n\nSystem Context:\n${finalSystemPrompt}\n\nAvailable tools:\n${availableToolsContext}\n\nRecent conversation:\n${recentMessagesText}`,
      });
      
      activeToolNames = Array.from(new Set([...activeToolNames, ...object.selectedTools]));
      
      // If we are actively editing a specific document, never allow creating a new one (to avoid creating orphaned/invisible documents)
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

    const baseModel = provider(model);
    const activeModel = provider === mistral 
      ? withFallback(baseModel, google('gemini-2.5-flash'))
      : baseModel;

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
      onFinish: async ({ text, toolResults, usage }) => {
        if (!canPersist) {
          return;
        }

        try {
          const dbMessages = (messages || []).map((m: any) => ({
            role: m.role,
            content: getMessageText(m as any).trim() || m.content || '',
            toolInvocations: m.toolInvocations || [],
          }));

          const assistantMessage = {
            role: 'assistant',
            content: text,
            toolInvocations: toolResults?.map(result => ({
              ...result,
              state: 'result' as const,
            })) || []
          };
          dbMessages.push(assistantMessage);

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

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('An unexpected error occurred', { status: 500 });
  }
}

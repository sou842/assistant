import { auth } from '@/auth';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from 'ai';
import dbConnect from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';
import { formatMemoriesForPrompt } from '@/lib/memory-storage';
import mongoose from 'mongoose';
import { z } from 'zod';
import Task from '@/lib/models/Task';
import User from '@/lib/models/User';
import Contact from '@/lib/models/Contact';
import VaultItem from '@/lib/models/VaultItem';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { getMessageText } from '@/lib/ai/message-utils';
import { VAULT_GUIDELINES } from '@/lib/ai/vault-guidelines';
import { cleanPhone, computeNextRunAt } from '@/lib/schedule';
import { tools } from './tools';


// Allow streaming responses up to 40 seconds
export const maxDuration = 40;

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

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
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
});

const ALLOWED_MODELS = new Set([
  'mistral-small-latest',
  'mistral-large-latest',
  'gemini-2.5-flash',
  'codestral-latest',
  'deepseek-reasoner',
  'gpt-4o-mini',
]);



export async function POST(req: Request) {
  try {
    const session = await auth();
    const userName = session?.user?.name || "the user";
    const userEmail = session?.user?.email || "unknown";

    const parsed = chatRequestSchema.safeParse(await req.json());

    if (!parsed.success) {
      return new Response('Invalid request payload', { status: 400 });
    }

    const { messages, chatId, memories = [], model: requestedModel, systemPrompt: clientSystemPrompt } = parsed.data;

    const validChatId = chatId;

    const model = requestedModel && ALLOWED_MODELS.has(requestedModel)
      ? requestedModel
      : 'mistral-large-latest';

    const provider = model === 'deepseek-reasoner'
      ? deepseek
      : model === 'gpt-4o-mini'
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
      "3b. For schedule tasks: Use 'listScheduleTasks' first, then use 'updateScheduleTask' for edits and 'deleteScheduleTask' for deletion. Use 'createScheduleTask' only when user explicitly asks to create a new schedule task. Never claim create/update/delete succeeded unless tool result has success=true.",
      "4. For date & time: Use 'getTime' to get the current date or time for any location. Default is India. If the user asks for the current time or date without specifying a city, call 'getTime' with no arguments. Be specific with city names (e.g., 'London, UK') to avoid ambiguity.",
      "5. For GitHub: You have access to the user's GitHub account via a Personal Access Token. Use 'githubGetUser' to see their profile, 'githubListRepos' to list projects, 'githubGetRepo' for details, 'githubReadFile' to analyze code, and 'githubListCommits' to see recent changes or commit history. If you need to search for something across repos, use 'githubSearchCode'. You can help the user manage their repositories, analyze their code, or explain project structures.",
      "6. For Gmail: You can access the user's emails. Use 'gmailListMessages' to see their inbox or search for emails, and 'gmailGetMessage' to read the full content of an email. You can help the user summarize threads, find specific info, or keep track of their correspondence.",
      "7. For WhatsApp: You can send messages via Green API. Use 'whatsappSendMessage' to text the user or others from their personal account. Always verify the phone number format (country code + number, e.g., 919903149299). You can also manage contacts using 'saveContact', 'listContacts', and 'deleteContact'.",
      "8. For WhatsApp Contact Selection: If you see a tag like '@WhatsApp:Name (Phone)' at the start of a message, it is a RECIPIENT OVERRIDE. You MUST call 'whatsappSendMessage' using that phone number for the user's message. Do not mention or include this tag in your final response to the user.",
      "9. For Vault (Data Storage): The Vault stores spreadsheets (structured data), notes (unstructured data), and media galleries / albums. Use 'listVaultItems' to browse and 'getVaultItem' to read content. For creating/updating items, you MUST call 'getVaultNoteGuidelines' for notes OR 'getVaultSheetGuidelines' for spreadsheets beforehand to get the exact format. Do not use both at the same time. Always save spreadsheets, lists, notes, or media galleries / albums in the Vault when asked. To create a media gallery/album, call 'createVaultItem' with type='gallery' or type='album' and content=array of media objects (each having: id, filename, url, mediaType, size).",
      "10. For calling arbitrary APIs: Use 'callApi' when the user asks you to call, fetch, or request an external API or webhook. If they provide headers or a token (e.g. 'token: Bearer ...' or 'Authorization: ...'), make sure to pass them in the 'headers' object of the tool input. For token authentication, construct the appropriate 'Authorization' header. If they don't specify the HTTP method, default to 'GET'.",
      "11. For Google Meet/Google Calendar: You can manage meetings and schedule video calls via Google Meet. Use 'googleMeetSchedule' to book a new meeting and generate a video link (always specify the title, start time, end time, and attendees if mentioned). Use 'googleMeetListMeetings' to list upcoming meetings, 'googleMeetUpdate' to reschedule or edit details, and 'googleMeetCancel' to cancel a meeting.",
      "12. For Browser Control: Use 'browserControl' to automate browser tasks like opening tabs/websites, searching on Google/YouTube, clicking links/buttons, or running scripts. Since this is executed in real-time on the client side, you can run multiple actions sequentially across several steps to complete a task. If the user asks to 'open a website and open the first video', do NOT try to do it all at once; first call 'open_tab' with the website URL, wait for the result to return loaded, and then call 'click_element' or 'execute_script' to open the first video. For YouTube video elements, common selectors include 'ytd-rich-grid-media a#video-title-link, ytd-video-renderer a#video-title, #video-title, a[href*=\"/watch\"]'. If unsure of selectors, run an 'execute_script' query to inspect or search the DOM.",
      memoryContext
        ? `Use these saved user memories when relevant. Do not mention them unless it helps the answer.\n${memoryContext}`
        : "",
      attachedFilesContext
    ].filter(Boolean).join("\n\n");

    const finalSystemPrompt = clientSystemPrompt
      ? `${systemPrompt}\n\nAdditional Context:\n${clientSystemPrompt}`
      : systemPrompt;

    console.log(finalSystemPrompt, 'real prompt')

    // console.log(clientSystemPrompt, finalSystemPrompt, "tara")

    const normalizedMessages = (messages || []).map((m: any) => ({
      ...m,
      parts: m.parts || [{ type: 'text', text: String(m.content || '') }]
    }));
    const modelMessages = await convertToModelMessages(normalizedMessages);

    const result = streamText({
      model: provider(model),
      messages: modelMessages.length > 0 ? modelMessages : [{ role: 'user', content: ' ' }],
      system: finalSystemPrompt,
      tools,
      stopWhen: stepCountIs(10),
      onFinish: async ({ text, toolResults }) => {
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
        } catch (dbError) {
          console.error('Failed to persist chat to MongoDB:', dbError);
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

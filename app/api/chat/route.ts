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
import Contact from '@/lib/models/Contact';
import VaultItem from '@/lib/models/VaultItem';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { getMessageText } from '@/lib/ai/message-utils';
import { VAULT_GUIDELINES } from '@/lib/ai/vault-guidelines';
import { cleanPhone, computeNextRunAt } from '@/lib/schedule';

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN)");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to refresh Google access token: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.access_token;
}


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

const memoryCategorySchema = z.enum(['profile', 'preference', 'project', 'fact', 'instruction']);
const taskStatusSchema = z.enum(['todo', 'in-progress', 'done', 'backlog']);
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const vaultItemTypeSchema = z.enum(['spreadsheet', 'note', 'gallery', 'album']);
const scheduleStatusSchema = z.enum(['active', 'paused', 'completed', 'failed']);
const scheduleActionTypeSchema = z.enum(['weather_report', 'reminder']);
const scheduleTypeSchema = z.enum(['one_time', 'recurring']);

const tools = {
  saveMemory: tool({
    description:
      "Save durable user memory when the user explicitly asks you to remember, memorize, store, save, or note something for future chats. Choose the most accurate category. Do not call this for ordinary facts unless the user asks you to remember them.",
    inputSchema: z.object({
      title: z.string().min(2).max(80).describe('Short human-readable label for the memory.'),
      content: z.string().min(2).max(1000).describe('The exact useful memory to save, without the command words.'),
      category: memoryCategorySchema.describe('The best category for this memory.'),
      tags: z.array(z.string().min(1).max(24)).max(8).default([]).describe('Short lowercase tags.'),
    }),
    execute: async ({ title, content, category, tags }) => ({
      action: 'save_memory' as const,
      memory: {
        title,
        content,
        category,
        tags,
      },
      status: 'ready_for_client_persist' as const,
    }),
  }),

  getWeather: tool({
    description: "Get current weather or forecast for a specific location. Use this when the user asks about weather, temperature, or conditions. If you don't have coordinates, providing a city name as 'location' is sufficient.",
    inputSchema: z.object({
      location: z.string().describe("City name (e.g., 'Bangalore', 'London')"),
      latitude: z.number().optional().describe("Latitude of the location"),
      longitude: z.number().optional().describe("Longitude of the location"),
    }),
    execute: async ({ location, latitude, longitude }) => {
      let lat = latitude;
      let lon = longitude;

      // 1. Geocoding if only location name is provided
      if (location && (lat === undefined || lon === undefined)) {
        try {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
          const geoData = await geoRes.json();
          if (!geoData.results || geoData.results.length === 0) {
            return { error: `Could not find coordinates for "${location}"` };
          }
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        } catch (err) {
          return { error: "Geocoding service unavailable." };
        }
      }

      if (lat === undefined || lon === undefined) {
        return { error: "Missing location or coordinates." };
      }

      // 2. Fetch weather data
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const weatherData = await weatherRes.json();
        
        return {
          location: location || "the requested coordinates",
          latitude: lat,
          longitude: lon,
          current: weatherData.current_weather,
          daily: weatherData.daily,
          hourly: weatherData.hourly,
          units: weatherData.current_weather_units
        };
      } catch (err) {
        return { error: "Weather service unavailable." };
      }
    },
  }),

  getTime: tool({
    description: "Get current date and time for a specific location. Use this when the user asks for the time, date, or day of the week. Defaults to India if no location is specified.",
    inputSchema: z.object({
      location: z.string().default("India").describe("City or country name (e.g., 'London', 'USA', 'India')"),
    }),
    execute: async ({ location }) => {
      try {
        let timezone = "Asia/Kolkata"; // Default
        let resolvedLocation = "India";

        const aliases: Record<string, string> = {
          "bangalore": "Asia/Kolkata",
          "bengaluru": "Asia/Kolkata",
          "mumbai": "Asia/Kolkata",
          "bombay": "Asia/Kolkata",
          "delhi": "Asia/Kolkata",
          "new delhi": "Asia/Kolkata",
          "calcutta": "Asia/Kolkata",
          "kolkata": "Asia/Kolkata",
          "madras": "Asia/Kolkata",
          "chennai": "Asia/Kolkata",
          "pune": "Asia/Kolkata",
          "hyderabad": "Asia/Kolkata",
        };

        if (location && location.toLowerCase() !== "india") {
          const aliasTimezone = aliases[location.toLowerCase()];
          if (aliasTimezone) {
            timezone = aliasTimezone;
            resolvedLocation = location.charAt(0).toUpperCase() + location.slice(1);
          } else {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=10&language=en&format=json`);
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results.length > 0) {
              // Pick the most significant result (highest population or first major city)
              const bestMatch = geoData.results.sort((a: any, b: any) => (b.population || 0) - (a.population || 0))[0];
              timezone = bestMatch.timezone || "UTC";
              resolvedLocation = bestMatch.name + (bestMatch.country ? `, ${bestMatch.country}` : "");
            } else {
              return { error: `Could not find timezone for "${location}". Defaulting to India.` };
            }
          }
        }



        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });

        const formatted = formatter.format(now);
        
        return {
          location: resolvedLocation,
          timezone: timezone,
          formatted: formatted,
          timestamp: now.toISOString()
        };
      } catch (err) {
        return { error: "Time service unavailable." };
      }
    },
  }),

  listTasks: tool({
    description: "List the user's tasks from their task manager. Can filter by status, priority, or search by title. Use this when the user asks about their tasks, what they need to do, or wants to find a specific task.",
    inputSchema: z.object({
      status: taskStatusSchema.optional().describe('Filter by status (todo, in-progress, done, backlog)'),
      priority: taskPrioritySchema.optional().describe('Filter by priority (low, medium, high, urgent)'),
      search: z.string().optional().describe('Search for tasks with titles matching this query'),
    }),
    execute: async ({ status, priority, search }) => {
      try {
        await dbConnect();
        const filter: any = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) {
          filter.title = { $regex: search, $options: 'i' };
        }
        const tasks = await Task.find(filter).sort({ updatedAt: -1 }).limit(50);
        return { success: true, tasks: JSON.parse(JSON.stringify(tasks)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  createTask: tool({
    description: "Create a new task in the user's task manager.",
    inputSchema: z.object({
      title: z.string().min(1).max(100).describe('Short title of the task'),
      description: z.string().max(1000).optional().describe('Detailed description of what needs to be done'),
      status: taskStatusSchema.default('todo').describe('Initial status of the task'),
      priority: taskPrioritySchema.default('medium').describe('Priority level'),
      dueDate: z.string().optional().describe('Due date in ISO string format or YYYY-MM-DD'),
      tags: z.array(z.string()).default([]).describe('Optional tags for categorization'),
    }),
    execute: async (data) => {
      try {
        await dbConnect();
        const task = await Task.create(data);
        return { success: true, task: JSON.parse(JSON.stringify(task)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  updateTask: tool({
    description: "Update an existing task's details, status, or priority. You must have the task ID (usually found via listTasks).",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the task to update'),
      title: z.string().optional().describe('New title for the task'),
      description: z.string().optional().describe('New description'),
      status: taskStatusSchema.optional().describe('New status'),
      priority: taskPrioritySchema.optional().describe('New priority level'),
      dueDate: z.string().optional().describe('New due date'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
    }),
    execute: async ({ id, ...updateData }) => {
      try {
        await dbConnect();
        const task = await Task.findByIdAndUpdate(id, updateData, { new: true });
        if (!task) return { success: false, error: "Task not found" };
        return { success: true, task: JSON.parse(JSON.stringify(task)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  deleteTask: tool({
    description: "Delete a task from the task manager. Use with caution. Always confirm with the user first.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the task to delete'),
    }),
    execute: async ({ id }) => {
      try {
        await dbConnect();
        const result = await Task.deleteOne({ _id: id });
        if (result.deletedCount === 0) return { success: false, error: "Task not found" };
        return { success: true, message: "Task deleted successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  listScheduleTasks: tool({
    description: "List schedule tasks. Use this before claiming schedule task details or status.",
    inputSchema: z.object({
      status: scheduleStatusSchema.optional().describe('Filter by schedule status'),
    }),
    execute: async ({ status }) => {
      try {
        await dbConnect();
        const filter: any = {};
        if (status) filter.status = status;
        const tasks = await ScheduleTask.find(filter).sort({ updatedAt: -1 }).limit(50);
        return { success: true, tasks: JSON.parse(JSON.stringify(tasks)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  createScheduleTask: tool({
    description: "Create a schedule task (one-time or recurring). Use this for reminders, hourly checks, and automations.",
    inputSchema: z.object({
      title: z.string().min(1).max(140),
      actionType: scheduleActionTypeSchema,
      payload: z.object({
        phone: z.string(),
        message: z.string().optional(),
        city: z.string().optional(),
        messagePrefix: z.string().optional(),
      }),
      scheduleType: scheduleTypeSchema,
      runAt: z.string().optional(),
      intervalMinutes: z.number().int().positive().optional(),
      timezone: z.string().default('Asia/Kolkata'),
      status: scheduleStatusSchema.default('active'),
    }),
    execute: async (data) => {
      try {
        await dbConnect();
        const normalized = {
          ...data,
          payload: {
            ...data.payload,
            phone: cleanPhone(String(data.payload.phone)),
          },
          runAt: data.runAt ? new Date(data.runAt) : undefined,
        };
        const nextRunAt = computeNextRunAt(normalized as any);
        const task = await ScheduleTask.create({ ...normalized, nextRunAt });
        return { success: true, task: JSON.parse(JSON.stringify(task)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  updateScheduleTask: tool({
    description: "Update an existing schedule task by id. Use listScheduleTasks first to find the correct id. Do not create a new task when user asks to edit/update.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the schedule task to update'),
      title: z.string().min(1).max(140).optional(),
      actionType: scheduleActionTypeSchema.optional(),
      payload: z.object({
        phone: z.string().optional(),
        message: z.string().optional(),
        city: z.string().optional(),
        messagePrefix: z.string().optional(),
      }).optional(),
      scheduleType: scheduleTypeSchema.optional(),
      runAt: z.string().optional(),
      intervalMinutes: z.number().int().positive().optional(),
      timezone: z.string().optional(),
      status: scheduleStatusSchema.optional(),
    }),
    execute: async ({ id, ...updateData }) => {
      try {
        await dbConnect();
        const existing = await ScheduleTask.findById(id);
        if (!existing) return { success: false, error: "Schedule task not found" };

        const normalizedPayload = updateData.payload
          ? {
              ...updateData.payload,
              ...(updateData.payload.phone ? { phone: cleanPhone(String(updateData.payload.phone)) } : {}),
            }
          : undefined;

        const merged: any = {
          ...existing.toObject(),
          ...updateData,
          ...(normalizedPayload ? { payload: { ...existing.payload, ...normalizedPayload } } : {}),
          ...(updateData.runAt !== undefined ? { runAt: updateData.runAt ? new Date(updateData.runAt) : undefined } : {}),
        };

        const shouldRecomputeNextRun =
          updateData.scheduleType !== undefined ||
          updateData.runAt !== undefined ||
          updateData.intervalMinutes !== undefined;

        if (shouldRecomputeNextRun) {
          merged.nextRunAt = computeNextRunAt(merged);
        }

        const task = await ScheduleTask.findByIdAndUpdate(id, merged, {
          new: true,
          runValidators: true,
        });

        return { success: true, task: JSON.parse(JSON.stringify(task)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  deleteScheduleTask: tool({
    description: "Delete a schedule task by id. Use only when user clearly asks to delete/remove it.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the schedule task to delete'),
    }),
    execute: async ({ id }) => {
      try {
        await dbConnect();
        const result = await ScheduleTask.deleteOne({ _id: id });
        if (result.deletedCount === 0) return { success: false, error: "Schedule task not found" };
        return { success: true, message: "Schedule task deleted successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  githubGetUser: tool({
    description: "Get the authenticated GitHub user's profile information. Use this to find out who the current user is.",
    inputSchema: z.object({}),
    execute: async () => {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return { error: `GitHub API error: ${res.statusText}` };
      return await res.json();
    },
  }),

  githubListRepos: tool({
    description: "List the user's GitHub repositories.",
    inputSchema: z.object({
      sort: z.enum(["created", "updated", "pushed", "full_name"]).default("updated"),
      per_page: z.number().max(100).default(30),
    }),
    execute: async ({ sort, per_page }) => {
      const res = await fetch(`https://api.github.com/user/repos?sort=${sort}&per_page=${per_page}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return { error: `GitHub API error: ${res.statusText}` };
      const repos = await res.json();
      return repos.map((repo: any) => ({
        name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        updated_at: repo.updated_at,
      }));
    },
  }),

  githubGetRepo: tool({
    description: "Get detailed information about a specific GitHub repository.",
    inputSchema: z.object({
      owner: z.string().describe("The account owner of the repository. The name is not case sensitive."),
      repo: z.string().describe("The name of the repository. The name is not case sensitive."),
    }),
    execute: async ({ owner, repo }) => {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return { error: `GitHub API error: ${res.statusText}` };
      return await res.json();
    },
  }),

  githubReadFile: tool({
    description: "Read the content of a file from a GitHub repository. Useful for analyzing code.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string().describe("The file path (e.g., 'README.md' or 'src/index.ts')"),
      ref: z.string().optional().describe("The name of the commit/branch/tag. Default: the repository's default branch."),
    }),
    execute: async ({ owner, repo, path, ref }) => {
      let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      if (ref) url += `?ref=${ref}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return { error: `GitHub API error: ${res.statusText}` };
      const data = await res.json();
      
      if (data.type === 'file' && data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return { content, size: data.size, name: data.name };
      }
      return { error: "The path did not point to a single file, or it was too large." };
    },
  }),

  githubSearchCode: tool({
    description: "Search for code across GitHub repositories.",
    inputSchema: z.object({
      q: z.string().describe("The query contains one or more search keywords and qualifiers. (e.g., 'addClass user:mozilla')"),
      per_page: z.number().max(100).default(10),
    }),
    execute: async ({ q, per_page }) => {
      const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=${per_page}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return { error: `GitHub API error: ${res.statusText}` };
      const data = await res.json();
      return data.items.map((item: any) => ({
        name: item.name,
        path: item.path,
        repo: item.repository.full_name,
        url: item.html_url,
      }));
    },
  }),

  githubListCommits: tool({
    description: "List commits for a specific GitHub repository. Use this to see recent changes or find commit details.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      per_page: z.number().max(100).default(10),
      sha: z.string().optional().describe("SHA or branch name to start listing commits from."),
    }),
    execute: async ({ owner, repo, per_page, sha }) => {
      let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${per_page}`;
      if (sha) url += `&sha=${sha}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return { error: `GitHub API error: ${res.statusText}` };
      const commits = await res.json();
      return commits.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      }));
    },
  }),

  gmailListMessages: tool({
    description: "List the user's Gmail messages. You can provide a search query (e.g., 'from:github' or 'is:unread').",
    inputSchema: z.object({
      q: z.string().optional().describe("Gmail search query (e.g., 'from:someone@example.com' or 'has:attachment')"),
      maxResults: z.number().max(50).default(10),
    }),
    execute: async ({ q, maxResults }) => {
      try {
        const token = await getGoogleAccessToken();
        let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return { error: `Gmail API error: ${res.statusText}` };
        const data = await res.json();
        
        if (!data.messages) return { messages: [], total: 0 };

        const messages = await Promise.all(
          data.messages.map(async (m: any) => {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=minimal`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const detail = await detailRes.json();
            return {
              id: detail.id,
              snippet: detail.snippet,
              threadId: detail.threadId,
            };
          })
        );

        return { messages, total: data.resultSizeEstimate };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  gmailGetMessage: tool({
    description: "Get the full content of a specific Gmail message using its ID.",
    inputSchema: z.object({
      id: z.string().describe("The Gmail message ID."),
    }),
    execute: async ({ id }) => {
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return { error: `Gmail API error: ${res.statusText}` };
        const data = await res.json();
        
        const headers = data.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value;
        const from = headers.find((h: any) => h.name === 'From')?.value;
        const date = headers.find((h: any) => h.name === 'Date')?.value;

        let body = "";
        if (data.payload.parts) {
          const part = data.payload.parts.find((p: any) => p.mimeType === 'text/plain') || data.payload.parts[0];
          if (part && part.body && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf8');
          }
        } else if (data.payload.body && data.payload.body.data) {
          body = Buffer.from(data.payload.body.data, 'base64').toString('utf8');
        }

        return { id, subject, from, date, body, snippet: data.snippet };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  whatsappSendMessage: tool({
    description: "Send a WhatsApp message to a specific number using Green API. Use this when the user asks you to text or message someone on WhatsApp.",
    inputSchema: z.object({
      to: z.string().describe("The recipient's phone number with country code (e.g., '919903149299')"),
      message: z.string().describe("The content of the WhatsApp message."),
    }),
    execute: async ({ to, message }) => {
      console.log(`WhatsApp tool called: to=${to}, message=${message}`);
      try {
        const idInstance = process.env.GREEN_API_ID_INSTANCE;
        const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;

        if (!idInstance || !apiTokenInstance) {
          return { error: "Missing Green API credentials (GREEN_API_ID_INSTANCE or GREEN_API_TOKEN_INSTANCE)" };
        }

        // Clean number: remove '+', 'whatsapp:', and any spaces
        const cleanNumber = to.replace(/[^0-9]/g, '');
        const chatId = `${cleanNumber}@c.us`;

        const res = await fetch(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            message,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          return { error: `Green API error: ${error.message || res.statusText}` };
        }

        const data = await res.json();
        return { success: true, idMessage: data.idMessage };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  saveContact: tool({
    description: "Save a WhatsApp contact (name and phone number) to the database.",
    inputSchema: z.object({
      name: z.string().describe("The name of the contact."),
      phone: z.string().describe("The WhatsApp phone number with country code (e.g., '919903149299')."),
    }),
    execute: async ({ name, phone }) => {
      try {
        await dbConnect();
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const contact = await Contact.findOneAndUpdate(
          { phone: cleanPhone },
          { name, phone: cleanPhone },
          { upsert: true, new: true }
        );
        return { success: true, contact };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  listContacts: tool({
    description: "List all saved WhatsApp contacts.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        await dbConnect();
        const contacts = await Contact.find({}).sort({ name: 1 });
        return { contacts };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  getVaultNoteGuidelines: tool({
    description: "Get detailed technical guidelines for formatting Vault 'note' items (Editor.js JSON blocks). Call this if you need to create or update a note and are unsure about the block structures.",
    inputSchema: z.object({}),
    execute: async () => ({ guidelines: VAULT_GUIDELINES.VAULT_NOTE_GUIDELINES }),
  }),

  getVaultSheetGuidelines: tool({
    description: "Get detailed technical guidelines for formatting Vault 'spreadsheet' items (array of objects). Call this if you need to create or update a spreadsheet and are unsure about the structure.",
    inputSchema: z.object({}),
    execute: async () => ({ guidelines: VAULT_GUIDELINES.VAULT_SHEET_GUIDELINES }),
  }),

  listVaultItems: tool({
    description: "List all items in the user's Vault. The Vault stores spreadsheets and notes.",
    inputSchema: z.object({
      type: vaultItemTypeSchema.optional().describe('Filter by type (spreadsheet or note)'),
      search: z.string().optional().describe('Search for items with titles or tags matching this query'),
    }),
    execute: async ({ type, search }) => {
      try {
        await dbConnect();
        const filter: any = {};
        if (type) filter.type = type;
        if (search) {
          filter.$text = { $search: search };
        }
        // Exclude content for listing to save bandwidth
        const items = await VaultItem.find(filter, { content: 0 }).sort({ updatedAt: -1 }).limit(50);
        return { success: true, items: JSON.parse(JSON.stringify(items)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  getVaultItem: tool({
    description: "Get the full content of a specific Vault item (spreadsheet or note) by its ID.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Vault item'),
    }),
    execute: async ({ id }) => {
      try {
        await dbConnect();
        const item = await VaultItem.findById(id);
        if (!item) return { success: false, error: "Vault item not found" };
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  createVaultItem: tool({
    description: "Create a new item in the Vault (spreadsheet, note, gallery, or album). Use type='album' or type='gallery' to create an album of images or files.",
    inputSchema: z.object({
      title: z.string().min(1).max(100).describe('Title of the vault item'),
      type: vaultItemTypeSchema.describe('Type: spreadsheet, note, gallery, or album'),
      content: z.any().describe('Initial content. Use Editor.js blocks for notes, array of objects for spreadsheets, or array of media objects for galleries/albums (each media object should have: id, filename, url, mediaType, size).'),
      tags: z.array(z.string()).default([]).describe('Optional tags'),
    }),
    execute: async (data) => {
      try {
        await dbConnect();
        const item = await VaultItem.create(data);
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  updateVaultItem: tool({
    description: "Update an existing Vault item (spreadsheet, note, gallery, or album).",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Vault item to update'),
      title: z.string().optional().describe('New title'),
      content: z.any().optional().describe('New content. Completely replaces existing content. Use Editor.js blocks for notes, array of objects for spreadsheets, or array of media objects for galleries/albums.'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
    }),
    execute: async ({ id, ...updateData }) => {
      try {
        await dbConnect();
        const item = await VaultItem.findByIdAndUpdate(id, updateData, { new: true });
        if (!item) return { success: false, error: "Vault item not found" };
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  deleteVaultItem: tool({
    description: "Delete an item from the Vault. Use with caution.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Vault item to delete'),
    }),
    execute: async ({ id }) => {
      try {
        await dbConnect();
        const result = await VaultItem.deleteOne({ _id: id });
        if (result.deletedCount === 0) return { success: false, error: "Vault item not found" };
        return { success: true, message: "Vault item deleted successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  callApi: tool({
    description: "Make an HTTP/HTTPS API request to any external API. Use this when the user explicitly asks you to fetch data, call an API, make an API request, or trigger a webhook, optionally providing a URL, HTTP method, headers (such as a Bearer token), and a request body.",
    inputSchema: z.object({
      url: z.string().url().describe("The full URL of the API to call."),
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET").describe("The HTTP method to use (GET, POST, PUT, DELETE, PATCH)."),
      headers: z.record(z.string()).optional().describe("Key-value pairs of HTTP headers to send (e.g., Auth token, Content-Type)."),
      body: z.any().optional().describe("The JSON body to send with the request (for POST/PUT/PATCH requests)."),
    }),
    execute: async ({ url, method, headers, body }) => {
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        };

        if (body && ["POST", "PUT", "PATCH"].includes(method)) {
          fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
        }

        const res = await fetch(url, fetchOptions);
        
        let responseData;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          responseData = await res.json();
        } else {
          responseData = await res.text();
        }

        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          headers: responseHeaders,
          data: responseData,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    },
  }),

  googleMeetSchedule: tool({
    description: "Create a Google Calendar event with Google Meet enabled. Use this when the user asks to schedule a Google Meet, video call, or meeting.",
    inputSchema: z.object({
      summary: z.string().describe("Title or summary of the meeting"),
      description: z.string().optional().describe("Description or agenda of the meeting"),
      startTime: z.string().describe("Start time of the meeting in ISO format (YYYY-MM-DDTHH:MM:SS) or relative date/time context"),
      endTime: z.string().describe("End time of the meeting in ISO format (YYYY-MM-DDTHH:MM:SS) or relative date/time context"),
      attendees: z.array(z.string().email()).optional().describe("Optional list of attendee email addresses"),
      timezone: z.string().default("Asia/Kolkata").describe("Timezone for the meeting (e.g., 'Asia/Kolkata')"),
    }),
    execute: async ({ summary, description, startTime, endTime, attendees, timezone }) => {
      try {
        const token = await getGoogleAccessToken();
        const requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        const eventBody = {
          summary,
          description,
          start: {
            dateTime: startTime,
            timeZone: timezone,
          },
          end: {
            dateTime: endTime,
            timeZone: timezone,
          },
          attendees: attendees?.map(email => ({ email })),
          conferenceData: {
            createRequest: {
              requestId,
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        };

        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: `Google API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }

        const data = await res.json();
        const meetLink = data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri || null;

        return {
          success: true,
          eventId: data.id,
          htmlLink: data.htmlLink,
          meetLink,
          summary: data.summary,
          start: data.start,
          end: data.end,
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  googleMeetListMeetings: tool({
    description: "List upcoming calendar events to check schedules or retrieve Google Meet/video conference links.",
    inputSchema: z.object({
      timeMin: z.string().optional().describe("ISO format string to filter events starting from this time. Defaults to current time."),
      timeMax: z.string().optional().describe("ISO format string to filter events up to this time."),
      maxResults: z.number().max(50).default(10).describe("Maximum number of events to return."),
    }),
    execute: async ({ timeMin, timeMax, maxResults }) => {
      try {
        const token = await getGoogleAccessToken();
        const minTime = timeMin || new Date().toISOString();
        let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(minTime)}&maxResults=${maxResults}`;
        if (timeMax) {
          url += `&timeMax=${encodeURIComponent(timeMax)}`;
        }

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          return { success: false, error: `Google API error: ${res.statusText}` };
        }

        const data = await res.json();
        if (!data.items) return { success: true, meetings: [] };

        const meetings = data.items.map((event: any) => {
          const meetLink = event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri || null;
          return {
            id: event.id,
            summary: event.summary,
            description: event.description || "",
            start: event.start,
            end: event.end,
            meetLink,
            attendees: event.attendees?.map((a: any) => a.email) || [],
          };
        });

        return { success: true, meetings };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  googleMeetUpdate: tool({
    description: "Update details of an existing Google Calendar event or Google Meet, such as rescheduling, changing summary/description, or modifying attendees. You must have the event ID (usually retrieved via googleMeetListMeetings).",
    inputSchema: z.object({
      eventId: z.string().describe("The Google Calendar event ID to update"),
      summary: z.string().optional().describe("New title/summary for the meeting"),
      description: z.string().optional().describe("New description or agenda"),
      startTime: z.string().optional().describe("New start time in ISO format"),
      endTime: z.string().optional().describe("New end time in ISO format"),
      attendees: z.array(z.string().email()).optional().describe("Updated complete list of attendee email addresses"),
      timezone: z.string().default("Asia/Kolkata").describe("Timezone for the meeting"),
    }),
    execute: async ({ eventId, summary, description, startTime, endTime, attendees, timezone }) => {
      try {
        const token = await getGoogleAccessToken();
        const updateBody: any = {};
        if (summary !== undefined) updateBody.summary = summary;
        if (description !== undefined) updateBody.description = description;
        if (startTime !== undefined) {
          updateBody.start = {
            dateTime: startTime,
            timeZone: timezone,
          };
        }
        if (endTime !== undefined) {
          updateBody.end = {
            dateTime: endTime,
            timeZone: timezone,
          };
        }
        if (attendees !== undefined) {
          updateBody.attendees = attendees.map(email => ({ email }));
        }

        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateBody),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: `Google API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }

        const data = await res.json();
        const meetLink = data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri || null;

        return {
          success: true,
          eventId: data.id,
          meetLink,
          summary: data.summary,
          start: data.start,
          end: data.end,
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  googleMeetCancel: tool({
    description: "Cancel (delete) an existing Google Calendar event or Google Meet by event ID.",
    inputSchema: z.object({
      eventId: z.string().describe("The Google Calendar event ID to delete"),
    }),
    execute: async ({ eventId }) => {
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          return { success: false, error: `Google API error: ${res.statusText}` };
        }

        return { success: true, message: "Meeting canceled successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  browserControl: tool({
    description: "Control the user's browser via the extension. Use this when the user asks to open tabs, search on YouTube or Google, click page elements, or run custom JS scripts. Available actions: 'open_tab', 'search', 'click_element', 'execute_script', 'get_active_tab'.",
    inputSchema: z.object({
      action: z.enum(['open_tab', 'search', 'click_element', 'execute_script', 'get_active_tab'])
        .describe("The browser action to execute"),
      url: z.string().optional()
        .describe("The target URL (required for 'open_tab')"),
      selector: z.string().optional()
        .describe("CSS selector to click (required for 'click_element')"),
      query: z.string().optional()
        .describe("Search query (required for 'search')"),
      script: z.string().optional()
        .describe("JavaScript string to execute (required for 'execute_script')"),
      description: z.string()
        .describe("User-friendly explanation of what this browser command is doing (e.g., 'Opening YouTube')"),
    }),
  }),
};

export async function POST(req: Request) {
  try {
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
      `Current Time Context: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata). Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}. Use this current time as the source of truth for scheduling and relative dates/times (e.g. "tomorrow", "next Tuesday", etc).`,
      "Tool & Memory policy:",
      "1. To remember information: call 'saveMemory' when explicitly asked to remember/memorize/store facts. Pick categories carefully.",
      "2. For weather: To get weather, you need coordinates. Search memories for the user's location/city. If not found, ask the user for their location. Once you have a city name or coordinates, call 'getWeather'.",
      "3. For tasks: You can manage the user's tasks. Use 'listTasks' to see what's on their plate, 'createTask' to add new ones, 'updateTask' to change details or status, and 'deleteTask' to remove them. Always confirm with the user before deleting.",
      "3b. For schedule tasks: Use 'listScheduleTasks' first, then use 'updateScheduleTask' for edits and 'deleteScheduleTask' for deletion. Use 'createScheduleTask' only when user explicitly asks to create a new schedule task. Never claim create/update/delete succeeded unless tool result has success=true.",
      "4. For date & time: Use 'getTime' to get the current date or time for any location. Default is India. If the user asks for the current time or date without specifying a city, call 'getTime' with no arguments. Be specific with city names (e.g., 'London, UK') to avoid ambiguity.",
      "5. For GitHub: You have access to the user's GitHub account via a Personal Access Token. Use 'githubGetUser' to see their profile, 'githubListRepos' to list projects, 'githubGetRepo' for details, 'githubReadFile' to analyze code, and 'githubListCommits' to see recent changes or commit history. If you need to search for something across repos, use 'githubSearchCode'. You can help the user manage their repositories, analyze their code, or explain project structures.",
      "6. For Gmail: You can access the user's emails. Use 'gmailListMessages' to see their inbox or search for emails, and 'gmailGetMessage' to read the full content of an email. You can help the user summarize threads, find specific info, or keep track of their correspondence.",
      "7. For WhatsApp: You can send messages via Green API. Use 'whatsappSendMessage' to text the user or others from their personal account. Always verify the phone number format (country code + number, e.g., 919903149299). You can also manage contacts using 'saveContact' and 'listContacts'.",
      "8. For WhatsApp Contact Selection: If you see a tag like '@WhatsApp:Name (Phone)' at the start of a message, it is a RECIPIENT OVERRIDE. You MUST call 'whatsappSendMessage' using that phone number for the user's message. Do not mention or include this tag in your final response to the user.",
      "9. For Vault (Data Storage): The Vault stores spreadsheets (structured data), notes (unstructured data), and media galleries / albums. Use 'listVaultItems' to browse and 'getVaultItem' to read content. For creating/updating items, use 'getVaultNoteGuidelines' for notes or 'getVaultSheetGuidelines' for spreadsheets if you are unsure about the format. Always save spreadsheets, lists, notes, or media galleries / albums in the Vault when asked. To create a media gallery/album, call 'createVaultItem' with type='gallery' or type='album' and content=array of media objects (each having: id, filename, url, mediaType, size).",
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
              $setOnInsert: { title: `${dbMessages[0]?.content?.slice(0, 50) || 'New Chat'}...` }
            }, { upsert: true });
          } else {
            // Fallback for safety, though validChatId should be present
            await Chat.create({
              title: `${dbMessages[0]?.content?.slice(0, 50) || 'New Chat'}...`,
              messages: dbMessages,
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

import { tool } from 'ai';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/Task';
import User from '@/lib/models/User';
import Contact from '@/lib/models/Contact';
import VaultItem from '@/lib/models/VaultItem';
import StudioDocument from '@/lib/models/StudioDocument';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { VAULT_GUIDELINES } from '@/lib/ai/vault-guidelines';
import { cleanPhone, computeNextRunAt } from '@/lib/schedule';

async function getGoogleAccessToken() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user?.googleRefreshToken) throw new Error("Google account not connected. Please connect it in the Integrations page.");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = user.googleRefreshToken;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)");
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

async function getGithubToken() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  if (!user?.githubAccessToken) throw new Error("GitHub account not connected. Please connect it in the Integrations page.");
  return user.githubAccessToken;
}



const memoryCategorySchema = z.enum(['profile', 'preference', 'project', 'fact', 'instruction']);
const taskStatusSchema = z.enum(['todo', 'in-progress', 'done', 'backlog']);
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const vaultItemTypeSchema = z.enum(['spreadsheet', 'note', 'gallery', 'album']);
const scheduleStatusSchema = z.enum(['active', 'paused', 'completed', 'failed']);
const scheduleTypeSchema = z.enum(['one_time', 'recurring']);

const baseStepSchema = z.object({
  id: z.string().describe("A unique string ID for this step, like 'step1' or 'fetch_weather'"),
  condition: z.string().optional().describe("Optional JS expression. If it evaluates to false, the step is skipped. E.g. 'context.fetch_price.data.bitcoin.usd < 60000'"),
});

const stepSchema = z.discriminatedUnion('type', [
  baseStepSchema.extend({
    type: z.literal('fetch_weather'),
    config: z.object({
      city: z.string().describe("City name to fetch weather for"),
    })
  }),
  baseStepSchema.extend({
    type: z.literal('ai_prompt'),
    config: z.object({
      prompt: z.string().describe("The prompt to send to the AI. Use {{context.stepId.key}} to inject data. The output is stored in both the 'data' and 'generatedText' fields."),
    })
  }),
  baseStepSchema.extend({
    type: z.literal('send_email'),
    config: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      bodyTemplate: z.string().describe("Email body content. ALWAYS use bodyTemplate, NEVER use body. Use {{context.stepId.key}} to inject data. fetch_weather provides keys: temperature, windspeed, time, weather.description, main.humidity."),
    })
  }),
  baseStepSchema.extend({
    type: z.literal('send_whatsapp'),
    config: z.object({
      phone: z.string().describe("Recipient phone number"),
      messageTemplate: z.string().describe("Message content. Use {{context.stepId.key}} to inject data."),
    })
  }),
  baseStepSchema.extend({
    type: z.literal('http_request'),
    config: z.object({
      url: z.string().describe("URL to fetch. Can use {{context.stepId.key}}"),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
      headers: z.record(z.string()).optional().describe("Key-value pairs for HTTP headers"),
      body: z.string().optional().describe("JSON string body for POST/PUT. Use templates like {{context.step1.key}}"),
    })
  }),
]);

export const tools = {
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
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const filter: any = { userId: session.user.id };
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
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const task = await Task.create({ ...data, userId: session.user.id });
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
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const task = await Task.findOneAndUpdate({ _id: id, userId: session.user.id }, updateData, { new: true });
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
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const result = await Task.deleteOne({ _id: id, userId: session.user.id });
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
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const filter: any = { userId: session.user.id };
        if (status) filter.status = status;
        const tasks = await ScheduleTask.find(filter).sort({ updatedAt: -1 }).limit(50);
        return { success: true, tasks: JSON.parse(JSON.stringify(tasks)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  createScheduleTask: tool({
    description: "Create a schedule task (one-time or recurring) containing multiple steps. Break down complex requests into steps. Use 'http_request' to hit external APIs and 'send_email' or 'send_whatsapp' to notify the user. Use 'fetch_weather' to get weather data, and 'ai_prompt' to analyze text/context using an AI. IMPORTANT: Context variables are passed via {{context.stepId.key}}. You MUST use the 'condition' field on a step if you want to skip it dynamically.",
    inputSchema: z.object({
      title: z.string().min(1).max(140),
      steps: z.array(stepSchema).min(1),
      scheduleType: scheduleTypeSchema,
      runAt: z.string().optional(),
      intervalMinutes: z.number().int().positive().optional(),
      timezone: z.string().default('Asia/Kolkata'),
      status: scheduleStatusSchema.default('active'),
    }),
    execute: async (data) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();

        // Normalize any phone numbers inside config of send_whatsapp steps
        const normalizedSteps = data.steps.map(s => {
          if (s.type === 'send_whatsapp' && s.config.phone) {
            return {
              ...s,
              config: {
                ...s.config,
                phone: cleanPhone(String(s.config.phone)),
              }
            };
          }
          return s;
        });

        const normalized = {
          ...data,
          steps: normalizedSteps,
          runAt: data.runAt ? new Date(data.runAt) : undefined,
        };
        const nextRunAt = computeNextRunAt(normalized as any);
        const task = await ScheduleTask.create({ ...normalized, nextRunAt, userId: session.user.id });
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
      steps: z.array(stepSchema).optional(),
      scheduleType: scheduleTypeSchema.optional(),
      runAt: z.string().optional(),
      intervalMinutes: z.number().int().positive().optional(),
      timezone: z.string().optional(),
      status: scheduleStatusSchema.optional(),
    }),
    execute: async ({ id, ...updateData }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const existing = await ScheduleTask.findOne({ _id: id, userId: session.user.id });
        if (!existing) return { success: false, error: "Schedule task not found" };

        // Normalize any phone numbers inside config of send_whatsapp steps if provided
        const normalizedSteps = updateData.steps
          ? updateData.steps.map(s => {
              if (s.type === 'send_whatsapp' && s.config.phone) {
                return {
                  ...s,
                  config: {
                    ...s.config,
                    phone: cleanPhone(String(s.config.phone)),
                  }
                };
              }
              return s;
            })
          : undefined;

        const merged: any = {
          ...existing.toObject(),
          ...updateData,
          ...(normalizedSteps ? { steps: normalizedSteps } : {}),
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
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const result = await ScheduleTask.deleteOne({ _id: id, userId: session.user.id });
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
      let token;
      try { token = await getGithubToken(); } catch (e: any) { return { error: e.message }; }
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
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
      let token;
      try { token = await getGithubToken(); } catch (e: any) { return { error: e.message }; }
      const res = await fetch(`https://api.github.com/user/repos?sort=${sort}&per_page=${per_page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
      let token;
      try { token = await getGithubToken(); } catch (e: any) { return { error: e.message }; }
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
      let token;
      try { token = await getGithubToken(); } catch (e: any) { return { error: e.message }; }
      let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      if (ref) url += `?ref=${ref}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
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
      let token;
      try { token = await getGithubToken(); } catch (e: any) { return { error: e.message }; }
      const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=${per_page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
      let token;
      try { token = await getGithubToken(); } catch (e: any) { return { error: e.message }; }
      let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${per_page}`;
      if (sha) url += `&sha=${sha}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
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

  gmailSendMessage: tool({
    description: "Send an email using Gmail.",
    inputSchema: z.object({
      to: z.string().describe("The recipient's email address"),
      subject: z.string().describe("The subject of the email"),
      body: z.string().describe("The body content of the email (plain text or HTML)"),
    }),
    execute: async ({ to, subject, body }) => {
      try {
        const token = await getGoogleAccessToken();
        const emailLines = [];
        emailLines.push(`To: ${to}`);
        emailLines.push('Content-type: text/html;charset=iso-8859-1');
        emailLines.push('MIME-Version: 1.0');
        emailLines.push(`Subject: ${subject}`);
        emailLines.push('');
        emailLines.push(body);
        const email = emailLines.join('\r\n').trim();
        const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: base64EncodedEmail }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { error: `Gmail API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }

        const data = await res.json();
        return { success: true, messageId: data.id, threadId: data.threadId };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  gmailDeleteMessage: tool({
    description: "Move a specific Gmail message to the trash using its ID.",
    inputSchema: z.object({
      id: z.string().describe("The Gmail message ID to delete."),
    }),
    execute: async ({ id }) => {
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { error: `Gmail API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }
        return { success: true, message: "Email moved to trash successfully" };
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
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        await dbConnect();
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const contact = await Contact.findOneAndUpdate(
          { phone: cleanPhone, userId: session.user.id },
          { name, phone: cleanPhone, userId: session.user.id },
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
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        await dbConnect();
        const contacts = await Contact.find({ userId: session.user.id }).sort({ name: 1 });
        return { contacts };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  deleteContact: tool({
    description: "Delete a WhatsApp contact by phone number.",
    inputSchema: z.object({
      phone: z.string().describe("The WhatsApp phone number of the contact to delete."),
    }),
    execute: async ({ phone }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        await dbConnect();
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const result = await Contact.deleteOne({ phone: cleanPhone, userId: session.user.id });
        if (result.deletedCount === 0) return { error: "Contact not found" };
        return { success: true, message: "Contact deleted successfully" };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  getVaultNoteGuidelines: tool({
    description: "Get detailed technical guidelines for formatting Vault 'note' items (Editor.js JSON blocks). You MUST call this before creating or updating a note.",
    inputSchema: z.object({}),
    execute: async () => ({ guidelines: VAULT_GUIDELINES.VAULT_NOTE_GUIDELINES }),
  }),

  getVaultSheetGuidelines: tool({
    description: "Get detailed technical guidelines for formatting Vault 'spreadsheet' items (array of objects). You MUST call this before creating or updating a spreadsheet.",
    inputSchema: z.object({}),
    execute: async () => ({ guidelines: VAULT_GUIDELINES.VAULT_SHEET_GUIDELINES }),
  }),

  listVaultItems: tool({
    description: "List all items in the user's Vault. The Vault stores spreadsheets, tables, sheets, notes, documents, files, galleries, and albums. Use this whenever the user asks about their tables, sheets, files, or vault contents.",
    inputSchema: z.object({
      type: vaultItemTypeSchema.optional().describe('Filter by type (spreadsheet or note)'),
      search: z.string().optional().describe('Search for items with titles or tags matching this query'),
    }),
    execute: async ({ type, search }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized: Missing user session" };

        await dbConnect();
        const filter: any = { userId: session.user.id };
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
    description: "Get the full content of a specific Vault item (spreadsheet, table, sheet, file, or note) by its ID.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Vault item'),
    }),
    execute: async ({ id }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized: Missing user session" };

        await dbConnect();
        const item = await VaultItem.findOne({ _id: id, userId: session.user.id });
        if (!item) return { success: false, error: "Vault item not found" };
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  createVaultItem: tool({
    description: "Create a new item in the Vault (spreadsheet, table, sheet, note, file, gallery, or album). Use type='album' or type='gallery' to create an album of images or files. IMPORTANT: Before creating a 'note', you MUST call 'getVaultNoteGuidelines'. Before creating a 'spreadsheet', you MUST call 'getVaultSheetGuidelines'. Do not guess the format.",
    inputSchema: z.object({
      title: z.string().min(1).max(100).describe('Title of the vault item'),
      type: vaultItemTypeSchema.describe('Type: spreadsheet, note, gallery, or album'),
      content: z.any().describe('Initial content. Use Editor.js blocks for notes, array of objects for spreadsheets, or array of media objects for galleries/albums (each media object should have: id, filename, url, mediaType, size).'),
      tags: z.array(z.string()).default([]).describe('Optional tags'),
    }),
    execute: async (data) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized: Missing user session" };

        await dbConnect();
        const item = await VaultItem.create({ ...data, userId: session.user.id });
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  updateVaultItem: tool({
    description: "Update an existing Vault item (spreadsheet, table, sheet, note, file, gallery, or album). Use 'getVaultItem' first to get the current content, then send the FULL updated content array/object here. IMPORTANT: Before updating a 'note', you MUST call 'getVaultNoteGuidelines'. Before updating a 'spreadsheet', you MUST call 'getVaultSheetGuidelines'. Do not guess the format.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Vault item to update'),
      title: z.string().optional().describe('New title'),
      content: z.any().optional().describe('New content. Completely replaces existing content. Use Editor.js blocks for notes, array of objects for spreadsheets, or array of media objects for galleries/albums.'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
    }),
    execute: async ({ id, ...updateData }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized: Missing user session" };

        await dbConnect();
        const item = await VaultItem.findOneAndUpdate({ _id: id, userId: session.user.id }, updateData, { new: true });
        if (!item) return { success: false, error: "Vault item not found" };
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  deleteVaultItem: tool({
    description: "Delete an item from the Vault (spreadsheet, table, sheet, note, file, gallery, or album). Use with caution.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Vault item to delete'),
    }),
    execute: async ({ id }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await dbConnect();
        const result = await VaultItem.deleteOne({ _id: id, userId: session.user.id });
        if (result.deletedCount === 0) return { success: false, error: "Vault item not found" };
        return { success: true, message: "Vault item deleted successfully" };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  loadDesignSystem: tool({
    description: "Load a specific design system and skill set (e.g., 'premium', 'paper', 'glassmorphism', 'storytelling') to use for generating a Studio Document. This returns the design guidelines and skills that you MUST follow when generating HTML. ALWAYS call this BEFORE calling 'createStudioDocument' or 'updateStudioDocument' unless you already have the design system loaded in context.",
    inputSchema: z.object({
      designSystem: z.enum(['premium', 'paper', 'glassmorphism', 'storytelling']).describe('The name of the design system to load.'),
    }),
    execute: async ({ designSystem }) => {
      try {
        const skillsDir = path.join(process.cwd(), 'lib', 'skills');
        const designPath = path.join(skillsDir, `design_${designSystem}.md`);
        const skillPath = path.join(skillsDir, `skill_${designSystem}.md`);

        const [designContent, skillContent] = await Promise.all([
          fs.readFile(designPath, 'utf-8').catch(() => `Design file not found for ${designSystem}`),
          fs.readFile(skillPath, 'utf-8').catch(() => `Skill file not found for ${designSystem}`),
        ]);

        return {
          success: true,
          designSystem,
          designRules: designContent,
          skillRules: skillContent,
          message: `Successfully loaded ${designSystem} design system. You MUST follow these rules when generating HTML.`
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  createStudioDocument: tool({
    description: "Create a new Studio Document. Use this when the user asks to generate a professional document, resume, slide, or HTML page. The content MUST be valid raw HTML. Use inline styles (e.g. `style='color: red'`). NEVER use `<style>` tags. NEVER generate `<html>`, `<head>`, or `<body>` tags.",
    inputSchema: z.object({
      title: z.string().min(1).describe('The title of the document'),
      content: z.string().describe('The raw HTML content of the document.'),
      tags: z.array(z.string()).default([]).describe('Optional tags'),
    }),
    execute: async (data) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        await dbConnect();
        const item = await StudioDocument.create({ ...data, userId: session.user.id });
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  }),

  updateStudioDocument: tool({
    description: "Update an existing Studio Document's title, HTML content, or tags. You must have the document ID. The content MUST be valid raw HTML. ALWAYS use Tailwind CSS utility classes in class attributes for all styling (e.g. class='p-6 bg-slate-900 text-white rounded-xl shadow-lg'). Do NOT wrap in <html>, <head>, or <body> tags. Do NOT use style blocks (<style>). Output pure, beautiful Tailwind HTML structures.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Studio Document to update'),
      title: z.string().optional().describe('New title for the document'),
      content: z.string().optional().describe('New raw HTML content styled with Tailwind CSS utility classes'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
    }),
    execute: async ({ id, ...updateData }) => {
      try {
        console.log("updateStudioDocument called with id:", id, "updateData keys:", Object.keys(updateData));
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        await dbConnect();
        const item = await StudioDocument.findOneAndUpdate(
          { _id: id, userId: session.user.id },
          { $set: updateData },
          { new: true }
        );
        if (!item) {
          console.error("Studio Document not found for id:", id);
          return { success: false, error: "Studio Document not found" };
        }
        return { success: true, item: JSON.parse(JSON.stringify(item)) };
      } catch (error: any) {
        console.error("updateStudioDocument error:", error);
        return { success: false, error: error.message };
      }
    },
  }),

  editStudioDocumentSection: tool({
    description: "Fast targeted edit for an existing Studio Document. Use this to update a specific section instead of rewriting the whole document. This is MUCH faster than updateStudioDocument. Provide a unique snippet of the existing HTML (targetText) and the new HTML (newText) that will replace it.",
    inputSchema: z.object({
      id: z.string().describe('The MongoDB ID of the Studio Document'),
      targetText: z.string().describe('A unique snippet of the existing HTML to be replaced. Must match exactly. Try to include the full opening and closing tags of the element you are modifying.'),
      newText: z.string().describe('The new HTML that will replace the targetText.'),
    }),
    execute: async ({ id, targetText, newText }) => {
      try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        await dbConnect();
        
        const doc = await StudioDocument.findOne({ _id: id, userId: session.user.id });
        if (!doc) return { success: false, error: "Studio document not found" };

        if (!doc.content || !doc.content.includes(targetText)) {
          return { success: false, error: "targetText not found in the document. Please ensure it matches exactly or use updateStudioDocument to replace the entire document." };
        }

        doc.content = doc.content.replace(targetText, newText);
        await doc.save();
        
        return { success: true, item: JSON.parse(JSON.stringify(doc)) };
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

  youtubeSearch: tool({
    description: "Search for videos on YouTube.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z.number().max(50).default(5),
    }),
    execute: async ({ query, maxResults }) => {
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { error: `YouTube API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }
        const data = await res.json();
        return {
          items: data.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`
          }))
        };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  youtubeGetVideo: tool({
    description: "Get detailed information about a specific YouTube video.",
    inputSchema: z.object({
      videoId: z.string().describe("The ID of the YouTube video"),
    }),
    execute: async ({ videoId }) => {
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { error: `YouTube API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
           return { error: "Video not found" };
        }
        const item = data.items[0];
        return {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          tags: item.snippet.tags,
          viewCount: item.statistics.viewCount,
          likeCount: item.statistics.likeCount,
          commentCount: item.statistics.commentCount,
          duration: item.contentDetails.duration,
          url: `https://www.youtube.com/watch?v=${item.id}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  youtubeGetChannel: tool({
    description: "Get detailed information about a specific YouTube channel.",
    inputSchema: z.object({
      channelId: z.string().describe("The ID of the YouTube channel"),
    }),
    execute: async ({ channelId }) => {
      try {
        const token = await getGoogleAccessToken();
        const res = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { error: `YouTube API error: ${res.statusText}. ${JSON.stringify(errData)}` };
        }
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
           return { error: "Channel not found" };
        }
        const item = data.items[0];
        return {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          customUrl: item.snippet.customUrl,
          viewCount: item.statistics.viewCount,
          subscriberCount: item.statistics.subscriberCount,
          videoCount: item.statistics.videoCount,
          url: `https://www.youtube.com/channel/${item.id}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    },
  }),

  tavilySearch: tool({
    description: "Search the web for real-time information, news, or deep research.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      searchDepth: z.enum(['basic', 'advanced']).optional().default('basic').describe("Use 'advanced' for deep research, 'basic' for quick facts/news"),
    }),
    execute: async ({ query, searchDepth }) => {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.TAVILY_API_KEY}`
          },
          body: JSON.stringify({
            query: query,
            search_depth: searchDepth,
            include_answer: true,
            include_images: false
          })
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return { error: `Tavily API error: ${response.statusText}. ${JSON.stringify(errData)}` };
        }
        
        const data = await response.json();
        return data;
      } catch (error: any) {
        return { error: error.message };
      }
    }
  }),
};


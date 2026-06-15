import ScheduleTask from '@/lib/models/ScheduleTask';
import ScheduleTaskRun from '@/lib/models/ScheduleTaskRun';
import User from '@/lib/models/User';
import nodemailer from 'nodemailer';
import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import vm from 'vm';

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: process.env.MISTRAL_BASE_URL,
});

export function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export function computeNextRunAt(task: any, from = new Date()) {
  if (task.scheduleType === 'one_time') {
    return task.runAt ? new Date(task.runAt) : null;
  }

  if (task.intervalMinutes && Number(task.intervalMinutes) > 0) {
    return new Date(from.getTime() + Number(task.intervalMinutes) * 60_000);
  }

  return null;
}

function getPathValue(obj: any, path: string): any {
  const normalizedPath = path
    .replace(/\["([^"]+)"\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\./, '');
  
  const parts = normalizedPath.split('.').filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// Helpers
function fillTemplate(template: string, context: any): string {
  if (!template) return '';
  return template.replace(/\{\{\s*(?:context\.)?([^}]+?)\s*\}\}/g, (match, path) => {
    let val = getPathValue(context, path);
    
    // Heuristic 1: If path includes .data. but not found, try removing it
    if (val === undefined && path.includes('.data.')) {
      val = getPathValue(context, path.replace('.data.', '.'));
    }
    
    // Heuristic 2: If path includes array access but property might be an object, try removing [0]
    if (val === undefined && path.includes('[0]')) {
      val = getPathValue(context, path.replace(/\[0\]/g, ''));
    }
    
    // Heuristic 3: Both
    if (val === undefined && path.includes('.data.') && path.includes('[0]')) {
      val = getPathValue(context, path.replace('.data.', '.').replace(/\[0\]/g, ''));
    }

    return val !== undefined ? String(val) : match;
  });
}

function getWeatherDesc(code: number): string {
  const mapping: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
  };
  return mapping[code] || 'Unknown';
}

async function getGoogleAccessTokenForUser(userId: any) {
  const user = await User.findById(userId);
  if (!user?.googleRefreshToken) {
    return null;
  }

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

// Action Handlers

async function executeFetchWeather(config: any, context: any) {
  const location = config.city || 'Kolkata';
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
  const geoData = await geoRes.json();

  if (!geoData?.results?.length) {
    throw new Error(`Could not find location for weather report: ${location}`);
  }

  const lat = geoData.results[0].latitude;
  const lon = geoData.results[0].longitude;

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m&timezone=auto`
  );
  const weather = await weatherRes.json();
  const current = weather?.current_weather;

  if (!current) throw new Error('Weather API returned no current_weather data');

  let humidity = 50;
  if (weather.hourly?.relative_humidity_2m && weather.hourly?.time) {
    const nowHourStr = new Date().toISOString().substring(0, 14) + '00';
    const idx = weather.hourly.time.findIndex((t: string) => t.startsWith(nowHourStr.substring(0, 13)));
    if (idx !== -1) {
      humidity = weather.hourly.relative_humidity_2m[idx];
    }
  }

  const description = getWeatherDesc(current.weathercode);

  return {
    location,
    temperature: current.temperature,
    windspeed: current.windspeed,
    time: current.time,
    // Add nested properties to match common weather API schemas (OpenWeatherMap style)
    main: {
      temp: current.temperature,
      humidity,
    },
    weather: [
      { description }
    ],
    wind: {
      speed: current.windspeed,
    }
  };
}

async function executeAIPrompt(config: any, context: any) {
  const prompt = config.prompt || 'Summarize the context.';
  const contextString = JSON.stringify(context);
  
  const { text } = await generateText({
    model: mistral('mistral-small-latest'),
    prompt: `${prompt}\n\nContext Data:\n${contextString}`,
  });
  
  return { generatedText: text, data: text };
}

async function executeSendEmail(config: any, context: any, task: any) {
  const { to, subject, bodyTemplate } = config;
  
  const body = fillTemplate(bodyTemplate || '', context);
  const resolvedSubject = fillTemplate(subject || 'Scheduled Notification', context);

  // Try Gmail API via Google account if connected
  try {
    if (task?.userId) {
      const googleToken = await getGoogleAccessTokenForUser(task.userId);
      if (googleToken) {
        const emailLines = [];
        emailLines.push(`To: ${to}`);
        emailLines.push('Content-type: text/html;charset=iso-8859-1');
        emailLines.push('MIME-Version: 1.0');
        emailLines.push(`Subject: ${resolvedSubject}`);
        emailLines.push('');
        emailLines.push(body.replace(/\n/g, '<br>'));
        const email = emailLines.join('\r\n').trim();
        const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: base64EncodedEmail }),
        });

        if (res.ok) {
          const data = await res.json();
          return { messageId: data.id, to, provider: 'gmail' };
        }
        
        console.warn(`Gmail API failed with status ${res.status}, falling back to SMTP if configured`);
      }
    }
  } catch (gmailErr: any) {
    console.warn(`Gmail API send failed: ${gmailErr.message}. Falling back to SMTP if configured`);
  }

  // Fallback to Nodemailer SMTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Please connect your Google account in Integrations or configure SMTP credentials in .env.local to send emails.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"AI Assistant" <noreply@example.com>',
    to,
    subject: resolvedSubject,
    text: body,
  });

  return { messageId: info.messageId, to, provider: 'smtp' };
}

async function executeSendWhatsapp(config: any, context: any) {
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;

  if (!idInstance || !apiTokenInstance) {
    throw new Error('Missing Green API credentials');
  }

  const message = fillTemplate(config.messageTemplate || '', context);

  const cleanNumber = cleanPhone(config.phone);
  const chatId = `${cleanNumber}@c.us`;

  const res = await fetch(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Green API error: ${errText}`);
  }

  return res.json();
}

async function executeHttpRequest(config: any, context: any) {
  const url = fillTemplate(config.url || '', context);
  const method = config.method || 'GET';
  
  let headers: Record<string, string> = {};
  if (config.headers) {
    for (const [k, v] of Object.entries(config.headers)) {
      headers[k] = fillTemplate(String(v), context);
    }
  }

  let body = undefined;
  if (config.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    body = fillTemplate(config.body, context);
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(url, { method, headers, body });
  let responseData;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    responseData = await res.json().catch(() => ({}));
  } else {
    responseData = await res.text();
  }

  return { status: res.status, ok: res.ok, data: responseData };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Unexpected retry loop exit');
}

async function executeRunScript(config: any, context: any) {
  throw new Error("Script execution is disabled for security reasons.");
}

export async function executeScheduleTaskRun(task: any, run: any) {
  if (run.status !== 'running') return { success: false, error: 'Run is not active' };

  try {
    const steps = task.steps || [];
    let currentStepIndex = run.currentStepIndex || 0;
    let localContext = run.context || {};
    
    // Process all remaining steps sequentially
    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      let stepOutput: any = {};

      if (step.condition) {
        try {
          const fn = new Function('context', `return ${step.condition};`);
          const shouldRun = fn(localContext);
          if (!shouldRun) {
            localContext = { ...localContext, [step.id]: { skipped: true } };
            run.context = localContext;
            if (typeof run.markModified === 'function') run.markModified('context');
            currentStepIndex++;
            run.currentStepIndex = currentStepIndex;
            await run.save();
            continue; // Skip to next step
          }
        } catch (err) {
            console.warn(`Failed to evaluate condition for step ${step.id}:`, err);
        }
      }

      try {
        switch (step.type) {
          case 'fetch_weather':
            stepOutput = await withRetry(() => executeFetchWeather(step.config, localContext));
            break;
          case 'ai_prompt':
            stepOutput = await executeAIPrompt(step.config, localContext);
            break;
          case 'send_email':
            stepOutput = await withRetry(() => executeSendEmail(step.config, localContext, task));
            break;
          case 'send_whatsapp':
            stepOutput = await withRetry(() => executeSendWhatsapp(step.config, localContext));
            break;
          case 'http_request':
            stepOutput = await withRetry(() => executeHttpRequest(step.config, localContext));
            break;
          case 'run_script':
            stepOutput = await executeRunScript(step.config, localContext);
            break;
          default:
            throw new Error(`Unsupported step type: ${step.type}`);
        }
      } catch (stepError: any) {
        throw new Error(`[Step: ${step.id}] ${stepError.message || 'Unknown error'}`);
      }

      // Update context and increment index
      localContext = {
        ...localContext,
        [step.id]: stepOutput,
      };
      run.context = localContext;
      if (typeof run.markModified === 'function') {
        run.markModified('context');
      }
      currentStepIndex++;
      run.currentStepIndex = currentStepIndex;
      await run.save();
    }

    // All steps completed
    const endedAt = new Date();
    run.status = 'success';
    run.endedAt = endedAt;
    await run.save();
    
    const nextRunAt = computeNextRunAt(task, endedAt);
    const isOneTime = task.scheduleType === 'one_time';
    
    await ScheduleTask.findByIdAndUpdate(task._id, {
      lastRunAt: endedAt,
      nextRunAt: isOneTime ? null : nextRunAt,
      status: isOneTime ? 'completed' : 'active',
      isRunning: false,
      lastError: null,
    });
    
    return { success: true, completed: true };

  } catch (error: any) {
    run.status = 'failed';
    run.error = error?.message || 'Unknown error';
    run.endedAt = new Date();
    await run.save();

    await ScheduleTask.findByIdAndUpdate(task._id, {
      lastRunAt: new Date(),
      isRunning: false,
      status: 'failed',
      lastError: error?.message || 'Unknown error',
      nextRunAt: task.scheduleType === 'recurring' ? computeNextRunAt(task, new Date()) : null,
    });

    return { success: false, error: error?.message || 'Unknown error' };
  }
}

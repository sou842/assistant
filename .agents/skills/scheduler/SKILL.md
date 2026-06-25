---
name: scheduler
description: Use this skill whenever creating or updating a scheduled job, notification, or automated task. This ensures perfectly formatted scheduler objects for the database.
---

# Scheduler Skill Guidelines

When asked to create or update a scheduler (for Email, WhatsApp, or API calls), you must strictly follow these object schemas and guidelines to ensure the data is perfectly formatted for the database.

## 1. Core Scheduler Object Schema
Every scheduled job must result in an object conforming to this base interface:

```typescript
interface SchedulerJob {
  // A unique identifier for the job
  jobId: string;
  // ISO-8601 string representing when the job should execute
  targetTime: string; 
  // The type of job: 'email', 'whatsapp', or 'api'
  type: 'email' | 'whatsapp' | 'api';
  // Job status, default to 'pending'
  status: 'pending' | 'completed' | 'failed';
  // Channel-specific payload
  payload: EmailPayload | WhatsAppPayload | APIPayload;
  // Optional metadata
  metadata?: Record<string, any>;
}
```

## 2. WhatsApp Format
When creating a `whatsapp` scheduler, use the following payload structure. Ensure phone numbers include the international country code without '+' or '00' (e.g., '14155552671').

```typescript
interface WhatsAppPayload {
  toPhoneNumber: string;
  // If using a template message (recommended for business initiated)
  template?: {
    name: string; // e.g., 'appointment_reminder'
    language: string; // e.g., 'en_US'
    components: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'image' | 'currency' | 'date_time';
        text?: string;
      }>;
    }>;
  };
  // If using a regular text message
  text?: {
    body: string;
  };
}
```

## 3. Email Format
When creating an `email` scheduler, use the following payload structure. Always provide `html` content, and include a `text` fallback if possible.

```typescript
interface EmailPayload {
  to: string | string[]; // Single email or array of emails
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string; // HTML formatted email body
  text?: string; // Plain text fallback
  fromName?: string; // Optional sender name display
}
```

## 4. API Request Format
When creating an `api` scheduler, use the following payload structure.

```typescript
interface APIPayload {
  url: string; // Full endpoint URL
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>; // e.g. { 'Authorization': 'Bearer ...' }
  body?: any; // JSON body payload for POST/PUT/PATCH
  queryParams?: Record<string, string>;
}
```

## Instructions for AI
1. When generating code, always construct a valid `SchedulerJob` object using the definitions above.
2. Store the object in the database or return it as defined by the user's specific context.
3. Validate that `targetTime` is a valid ISO-8601 string in the future.
4. Provide complete, working examples utilizing these interfaces.

## Strict Formatting and Templating Rules
**CRITICAL:** When constructing the `payload` (especially for emails), you must adhere to the following rules:
- **No Markdown in HTML**: Do NOT use Markdown formatting (like `**bold**` or `*italic*`) inside the `html` field of an email payload. You must use valid HTML tags like `<strong>`, `<b>`, or `<i>` instead. The email body must be pure HTML.
- **Dynamic Template Variables & External Data**: If the scheduled job fetches external data (e.g., weather API, financial data) to populate the message:
  1. **Check the Data Source First**: You MUST first understand the exact JSON structure returned by the external source. Do not guess the structure.
  2. **Match the Template**: Construct your template variables to match the *actual* data structure perfectly (e.g., if the data returns `{ "temp": 28, "desc": "clear" }`, use exactly what the templating engine requires for those keys).
  3. **No Blind Placeholders**: Do not invent generic placeholders like `{{fetch_weather.weather.description}}` unless you have explicitly verified that this exact object path will be available in the execution context.
- **Emoji and Character Encoding**: When using emojis or special characters in subjects or titles, ensure they are properly encoded (e.g. standard UTF-8 emojis) so they do not render as garbled text (like `Ã°ÂŸÂŒÂ¤Ã¯Â¸Â`). Avoid overly complex Unicode sequences if the email client or database encoding struggles with them.

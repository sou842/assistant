export const SCHEDULER_GUIDELINES = `
Scheduler Task Formatting and Validation Guidelines.

When creating or modifying scheduled tasks, follow these strict rules to prevent runtime failures and broken outputs (such as template resolution errors, markdown rendering in emails, or garbled emojis in subject lines).

1. NO MARKDOWN IN EMAIL BODY TEMPLATES
- Email bodies MUST be pure HTML. DO NOT use markdown like **bold**, *italic*, or "-" for list items.
- Always use standard raw HTML tags instead:
  - For bold text: Use <b> or <strong>
  - For line breaks: Use <br> or wrap paragraphs in <p>
  - For lists: Use <ul> and <li>
- Example:
  Correct: "Hello <b>Sourav</b>,<br>Here is the update."
  Incorrect: "Hello **Sourav**,\nHere is the update."

2. DYNAMIC TEMPLATE VARIABLES & PATH RESOLUTION
- When reference data from a previous step (e.g., fetch_weather or http_request):
  - Always use the syntax {{context.stepId.path.to.key}}.
  - Verify if "context." prefix is needed. For the email/whatsapp templating engine, always use {{context.stepId.key}}.
  - Double-check the exact path. For example, if fetch_weather returns:
    { "temp": 28.5, "weather": { "description": "clear sky" } }
    The correct template is {{context.fetch_weather.weather.description}}.
  - DO NOT make up metadata fields like 'time' or 'timestamp' on external APIs unless you have verified they exist.

3. STAGE-1 PRE-VERIFICATION FOR EXTERNAL APIs
- CRITICAL: If the task requires fetching an external API (via 'http_request' or similar tools) that you haven't recently called:
  - YOU MUST call the API first (e.g., using 'callApi' or standard query tools) to fetch a live sample response.
  - Inspect the JSON structure directly.
  - Only after confirming the exact keys and data types may you invoke 'createScheduleTask'.
  - NEVER guess, assume, or hallucinate the JSON response schema.

4. EMOJI AND CHARACTER ENCODING
- Use standard UTF-8 emojis in subjects/titles.
- Do not use complex, double-encoded unicode sequences that could render as garbled text (like "Ã°ÂŸÂŒÂ¤Ã¯Â¸Â").
- Keep subject lines clean and descriptive.

5. TASK MODIFICATIONS
- If the user asks to edit, pause, resume, or delete an existing schedule task:
  - First call 'listScheduleTasks' to find the task by ID or description.
  - Call 'updateScheduleTask' to modify it (e.g. set status to 'paused' or 'active').
  - Do NOT call 'createScheduleTask' when modifying an existing task.

6. GOOGLE API AUTHENTICATION (GMAIL, CALENDAR, ETC.)
- When calling Google APIs (e.g. Gmail API: https://www.googleapis.com/gmail/v1/...) in an 'http_request' step:
  - NEVER hardcode a temporary Google access token (Bearer ya29...), as it will expire after 1 hour.
  - Instead, use the dynamic placeholder {{context.googleAccessToken}}. The runner automatically refreshes and injects the user's Google token at run time.
  - Correct Header:
    "Authorization": "Bearer {{context.googleAccessToken}}"

7. DYNAMIC AI PROMPT OUTPUTS (RECOMMENDED: GENERATE FULL BODIES DIRECTLY)
- Instead of trying to parse complex JSON structures and bind multiple sub-properties (which often fails due to hallucinated keys or parsing issues), the MOST RELIABLE pattern is to have the AI generate the final message bodies directly.
- Create channel-specific AI steps:
  1. An 'ai_prompt' step for Email (e.g. ID: 'generate_email_body'): Instruct the prompt to output the complete, final email body in pure HTML (using <b>, <br>, <ul>, etc.).
  2. An 'ai_prompt' step for WhatsApp (e.g. ID: 'generate_whatsapp_body'): Instruct the prompt to output the complete, final WhatsApp message in plain text with WhatsApp markdown (using *bold*, \n, etc., and NO HTML).
- In the final action steps, simply inject the complete generated text block:
  - Email bodyTemplate: "{{context.generate_email_body.generatedText}}"
  - WhatsApp messageTemplate: "{{context.generate_whatsapp_body.generatedText}}"
- This is simple, extremely robust, and guarantees that variables will never be left unreplaced.

8. MANDATORY TEMPLATE VALIDATION
- Before calling 'createScheduleTask', you MUST carefully review all your steps and verify:
  1. Every single {{context.stepId...}} placeholder refers to a step ID that is actually defined earlier in the SAME task. Do not reference non-existent steps (e.g. do not invent a 'get_time' step).
  2. For AI prompt steps, always use {{context.stepId.generatedText}} to inject the complete output.
  3. If you need the current time inside the email or message body, fetch it before creating the task or add an explicit step to retrieve the time.

9. WHATSAPP FORMATTING VS EMAIL HTML FORMATTING
- Email body templates (bodyTemplate) MUST use HTML formatting (e.g. <b>, <ul>, <br>).
- WhatsApp message templates (messageTemplate) MUST NOT contain any HTML tags (no <b>, no <p>, no <br>). Always use WhatsApp Markdown:
  - Bold: Use asterisks (e.g. *text*)
  - Italic: Use underscores (e.g. _text_)
  - Line breaks: Use literal newline characters (\n).
`;

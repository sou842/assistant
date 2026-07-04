export const SCHEDULER_GUIDELINES = `
Scheduler Task Formatting and Validation Guidelines.

When creating or modifying scheduled tasks, follow these strict rules to prevent runtime failures and broken outputs (such as template resolution errors, markdown rendering in emails, or garbled emojis in subject lines).

1. STRICT EMAIL TEMPLATE STRUCTURE (NO MARKDOWN)
- Email bodies MUST be pure HTML. DO NOT use markdown like **bold**, *italic*, or "-" for list items.
- IMPORTANT: DO NOT wrap the HTML output in \`\`\`html ... \`\`\` code blocks. Provide ONLY the raw HTML string.
- DO NOT insert excessive <br> tags for spacing in the full template. Use proper margin/padding on block elements (<p>, <div>).
- You MUST use the following exact HTML structure for all emails, replacing [Title] and [Body] as needed.
- Do NOT deviate from this layout or inline CSS:

\`\`\`html
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0d0d0d; padding: 16px;">
    <h2 style="margin: 0; font-weight: 500; font-size: 20px; color: #ffffff; text-align: center;">[Title]</h2>
  </div>
  <div style="padding: 24px; line-height: 1.5; font-size: 15px;">
    <p style="margin-top: 0;">Hello there,</p>
    <p>[Body content with template variables like {{context.stepId.key}}]</p>
    <p style="margin-bottom: 0;">Best,<br>Your AI Assistant</p>
  </div>
  <div style="background-color: #f9f9f9; padding: 12px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999; text-align: center;">
    <p style="margin: 0;">Sent automatically via Scheduler AI</p>
  </div>
</div>
\`\`\`

2. DAG EXECUTION, DEPENDENCIES & DYNAMIC TEMPLATE VARIABLES
- Every step MUST define its dependencies using the 'dependsOn' array. If a step uses data from a previous step, add the parent step's 'id' to 'dependsOn'. If it has no dependencies, use an empty array [].
- Every step MUST explicitly save its output using the 'output' field. For example: "output": { "saveAs": "latestEmail" }.
- When referencing data from a previous step, ALWAYS use the standard bracket notation and reference the 'saveAs' variable name: {{context.latestEmail.messages[0].id}}
  - DO NOT use dot notation for array indices like .0.id, always use bracket notation like [0].id.
  - Double-check the exact path. For example, if a fetch_weather step saves as "weatherData" and returns: { "temp": 28.5, "weather": { "description": "clear sky" } }
    The correct template is {{context.weatherData.weather.description}}.
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
  1. An 'ai_prompt' step for Email (e.g. saveAs: 'generatedEmailBody'): Instruct the prompt to output the complete, final email body in pure HTML (using <b>, <br>, <ul>, etc.).
  2. An 'ai_prompt' step for WhatsApp (e.g. saveAs: 'generatedWhatsappBody'): Instruct the prompt to output the complete, final WhatsApp message in plain text with WhatsApp markdown (using *bold*, \n, etc., and NO HTML).
- In the final action steps, simply inject the complete generated text block:
  - Email bodyTemplate: "{{context.generatedEmailBody.generatedText}}"
  - WhatsApp messageTemplate: "{{context.generatedWhatsappBody.generatedText}}"
- This is simple, extremely robust, and guarantees that variables will never be left unreplaced.

8. MANDATORY TEMPLATE VALIDATION
- Before calling 'createScheduleTask', you MUST carefully review all your steps and verify:
  1. Every single {{context.varName...}} placeholder refers to a 'saveAs' variable name that is actually defined earlier in the SAME task. Do not reference non-existent variables.
  2. For AI prompt steps, always use {{context.varName.generatedText}} to inject the complete output.
  3. If you need the current time inside the email or message body, fetch it before creating the task or add an explicit step to retrieve the time.

9. WHATSAPP FORMATTING VS EMAIL HTML FORMATTING
- Email body templates (bodyTemplate) MUST use HTML formatting (e.g. <b>, <ul>, <br>).
- WhatsApp message templates (messageTemplate) MUST NOT contain any HTML tags (no <b>, no <p>, no <br>). Always use WhatsApp Markdown:
  - Bold: Use asterisks (e.g. *text*)
  - Italic: Use underscores (e.g. _text_)
  - Line breaks: Use literal newline characters (\n).
`;

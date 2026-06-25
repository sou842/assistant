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
`;

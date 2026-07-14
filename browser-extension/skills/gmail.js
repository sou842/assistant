// skills/gmail.js
// Skill specifically designed for Gmail interactions

if (self.SkillRegistry) {
  self.SkillRegistry.register({
    name: "Gmail",
    domain: /mail\.google\.com/,
    workflows: [
      {
        id: "6a511a846c1c98a9949142c9",
        description: "Compose and send emails using Gmail. Use this workflow to reliably send emails instead of doing it manually. Mandatory inputs: 'emails' (string, comma-separated list of recipient email addresses), 'subject' (string, subject line), 'body' (string, message body). Optional inputs: 'cc' (string, comma-separated), 'bcc' (string, comma-separated)."
      }
    ],
    
    systemInstruction: `
CRITICAL GMAIL INSTRUCTIONS:
- You are operating on Gmail. 
- ALWAYS prioritize using the run_workflow action with the defined Email Send workflow (check your Skill-Defined Workflows list) instead of trying to compose and send emails manually.
- If you MUST do it manually (e.g., the workflow doesn't support the specific action):

  ### 1. COMPOSING A NEW EMAIL
  - **CRITICAL SCOPE LIMITATION:** Do NOT click or type inside the top-level "Search mail" input bar at the top of the page. All composition actions (To, Cc, Bcc, Subject, Body, Send) MUST be targeted to elements inside the floating Compose window/dialog in the bottom-right corner of the screen (typically a container with \`role="dialog"\` or class \`AD\`).
  - **Compose Button:** Click the "Compose" button. Target:
    1. \`div[role="button"][aria-label="Compose"]\`
    2. Any element containing the text "Compose" with \`role="button"\` or \`role="checkbox"\`
    3. Element with class \`T-I-KE\`
  - **Wait for Compose Window:** After clicking "Compose", wait 1-2 seconds for the compose box to fully load in the bottom right corner of the page. Make sure your subsequent inputs are targeted inside this dialog.
  - **Recipient ("To") field:**
    - The "To" area initially appears as a static text label or container. You MUST first click inside it (often a table cell or a div containing "To" or "Recipients") to activate the editable input.
    - Once activated, target the actual text input or textarea using one of these selectors:
      1. \`input[aria-label="To recipients"]\` or \`input[aria-label="To"]\`
      2. \`textarea[aria-label="To recipients"]\` or \`textarea[aria-label="To"]\`
      3. \`div[role="combobox"][aria-label="To"]\`
      4. Any \`<input>\`, \`<textarea>\`, or editable \`div\` located inside the row or container labeled "To"
    - If the input is still not interactable, click on the text "To" or the empty space next to it first to activate the field.
    - Use the 'type' action to enter an email address, then immediately press the 'Enter' key to convert the typed text into a recipient chip/pill. Repeat this for multiple recipients.
  - **Cc and Bcc fields:**
    - If you need to add Cc or Bcc recipients, look for spans or buttons containing the text "Cc" or "Bcc" on the right side of the "To" input line. Click them to reveal the respective input fields.
    - Once revealed, target the inputs using:
      - Cc Input: \`input[aria-label="Cc recipients"]\`, \`textarea[aria-label="Cc recipients"]\`, or \`input[aria-label="Cc"]\`
      - Bcc Input: \`input[aria-label="Bcc recipients"]\`, \`textarea[aria-label="Bcc recipients"]\`, or \`input[aria-label="Bcc"]\`
    - Enter and chip these email addresses just like the "To" field.
  - **Subject field:**
    - Locate the input box using one of these selectors:
      1. \`input[name="subjectbox"]\`
      2. \`input[aria-label="Subject"]\`
      3. \`input[placeholder="Subject"]\`
    - Use the 'type' action to set the subject.
  - **Body field:**
    - The email body is a rich-text container with \`role="textbox"\` and \`aria-label="Message Body"\`. Locate it using:
      1. \`div[role="textbox"][aria-label="Message Body"]\`
      2. \`div[contenteditable="true"][aria-label="Message Body"]\`
    - First, click inside this element to focus it. Then use the 'fill' or 'type' action to populate the email message content.
  - **Send Button:**
    - Locate the "Send" button using:
      1. \`div[role="button"][aria-label^="Send"]\` (often contains text "Send" or the send shortcut key like Ctrl-Enter)
      2. A button/div containing the exact text "Send"
    - Use the 'click' action to send the email.
  - **Handling Confirmation Dialogs:**
    - If a popup appears asking to confirm sending (e.g., "Send this message without a subject..."), look for the confirmation button (usually text "OK" or \`button[name="ok"]\`) and click it.

  ### 2. READING EMAILS
  - Locate the email item in the inbox list and click on the subject line or the row to open the thread.
  - Wait for the email content to render completely before trying to read the body.

  ### 3. REPLYING TO EMAILS
  - To reply to an open email, scroll to the bottom of the email thread and click on the text area or the button containing the text "Reply" or having \`aria-label="Reply"\` (or click the curved back-arrow reply icon).
  - Once the inline reply composer expands, fill out the "Body" and click "Send" as specified in the compose section.

- Only perform actions that the user explicitly requests.
`
  });
}

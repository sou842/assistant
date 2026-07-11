// skills/gmail.js
// Skill specifically designed for Gmail interactions

if (self.SkillRegistry) {
  self.SkillRegistry.register({
    name: "Gmail",
    domain: /mail\.google\.com/,
    
    systemInstruction: `
CRITICAL GMAIL INSTRUCTIONS:
- You are operating on Gmail. 
- To compose an email, find the "Compose" button (often a div with role="button" containing "Compose").
- When filling out an email:
  1. The "To" field is usually an input with aria-label="To" or role="combobox". You must use 'type' to type the email and press Enter so it converts to a recipient pill.
  2. The "Subject" field is usually input[name="subjectbox"].
  3. The "Body" field is a rich text area, typically div[aria-label="Message Body"][role="textbox"]. Use 'fill' to set its content.
- To send an email, click the "Send" button (usually div[role="button"][aria-label^="Send"] or similar) or use the Ctrl+Enter / Cmd+Enter shortcut.
- To read an email, click on it in the list. Wait for the content to load before trying to read.
- To reply, look for the "Reply" button at the bottom of the email or in the top right menu.
- Only perform actions that the user explicitly requests.
    `
  });
}

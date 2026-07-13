// skills/whatsapp.js
// Skill specifically designed for WhatsApp Web interactions

if (self.SkillRegistry) {
  self.SkillRegistry.register({
    name: "WhatsApp",
    domain: /web\.whatsapp\.com/,
    workflows: [
      {
        id: "6a54935d098ec8aa2b628096",
        description: "Search for a contact and send a message using WhatsApp Web. Use this workflow to reliably send messages instead of doing it manually. Mandatory inputs: 'contactName' (string, the name of the person/group to message), 'message' (string, the message body)."
      }
    ],
    
    systemInstruction: `
CRITICAL WHATSAPP INSTRUCTIONS:
- You are operating on WhatsApp Web. 
- ALWAYS prioritize using the run_workflow action with the defined WhatsApp Message Send workflow (check your Skill-Defined Workflows list) instead of trying to search contacts and type messages manually.
- If you MUST do it manually (e.g., the workflow doesn't support the specific action):
  - To search for a contact, use the search bar: [aria-label='Search or start a new chat']. Use 'type' with the contact name and press Enter.
  - Wait for the contact to appear in the sidebar list and click on it.
  - To compose a message, find the compose box: div[contenteditable='true'][data-testid='conversation-compose-box-input'].
  - To send the message, click the send button: button[aria-label='Send'] or press Enter inside the compose box.
- Only perform actions that the user explicitly requests.
    `
  });
}

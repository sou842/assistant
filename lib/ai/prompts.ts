import fs from 'fs';
import path from 'path';

export interface SystemPromptVariables {
  baseUrl: string;
  userName: string;
  userEmail: string;
  currentTimeContext: string;
  browserExtensionConnected: boolean;
  memoryContext: string;
  attachedFilesContext: string;
  integrationContext: string;
}

export function renderSystemPrompt(vars: SystemPromptVariables): string {
  const filePath = path.join(process.cwd(), 'lib/ai/prompts/system_prompt.md');
  const template = fs.readFileSync(filePath, 'utf-8');

  const browserExtensionStatus = vars.browserExtensionConnected
    ? "The browser extension is currently CONNECTED. You can perform browser control tasks normally."
    : "CRITICAL: The browser extension is currently NOT connected. Do NOT attempt to use 'browserControl'. Instead, immediately inform the user that the browser extension is not connected and that they must make sure the browser extension is installed and the companion sidepanel is active before they can use this feature.";

  const formattedMemoryContext = vars.memoryContext
    ? `Use these saved user memories when relevant. Do not mention them unless it helps the answer.\n${vars.memoryContext}`
    : "";

  return template
    .replace('{{baseUrl}}', vars.baseUrl)
    .replace('{{userName}}', vars.userName)
    .replace('{{userEmail}}', vars.userEmail)
    .replace('{{currentTimeContext}}', vars.currentTimeContext)
    .replace('{{browserExtensionStatus}}', browserExtensionStatus)
    .replace('{{memoryContext}}', formattedMemoryContext)
    .replace('{{attachedFilesContext}}', vars.attachedFilesContext || '')
    .replace('{{integrationContext}}', vars.integrationContext || '')
    .trim();
}

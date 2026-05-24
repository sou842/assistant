import { Node, Edge } from '@xyflow/react';
import { NodeExecutionState } from './types';

export interface WorkflowTemplate {
  id: string;
  nodes: Node[];
  edges: Edge[];
}

const createNode = (id: string, toolId: string, x: number, y: number, config: Record<string, any> = {}): Node => ({
  id,
  type: 'customTool',
  position: { x, y },
  data: {
    toolId,
    config,
    state: { status: 'idle' } as NodeExecutionState,
  },
});

const createEdge = (source: string, target: string): Edge => ({
  id: `e-${source}-${target}`,
  source,
  target,
  animated: true,
});

export const PREBUILT_TEMPLATES: Record<string, WorkflowTemplate> = {
  "code-reviewer": {
    id: "code-reviewer",
    nodes: [
      createNode("repo-input", "text-input", 100, 200, { text: "owner/repo" }),
      createNode("github-commits", "githubListCommits", 400, 200),
      createNode("llm-review", "llm-prompt", 700, 200, { systemPrompt: "You are a code reviewer. Review the following recent commits and provide an analysis." }),
      createNode("review-output", "text-output", 1000, 200),
    ],
    edges: [
      createEdge("repo-input", "github-commits"),
      createEdge("github-commits", "llm-review"),
      createEdge("llm-review", "review-output"),
    ],
  },
  "daily-briefing": {
    id: "daily-briefing",
    nodes: [
      createNode("weather", "getWeather", 100, 100, { location: "New York" }),
      createNode("meetings", "googleMeetListMeetings", 100, 300),
      createNode("llm-summary", "llm-prompt", 400, 200, { systemPrompt: "Summarize the weather and meetings for today into a concise morning briefing." }),
      createNode("whatsapp", "whatsappSendMessage", 700, 200),
    ],
    edges: [
      createEdge("weather", "llm-summary"),
      createEdge("meetings", "llm-summary"),
      createEdge("llm-summary", "whatsapp"),
    ],
  },
  "email-triage": {
    id: "email-triage",
    nodes: [
      createNode("gmail", "gmailListMessages", 100, 200, { query: "is:unread" }),
      createNode("llm-triage", "llm-prompt", 400, 200, { systemPrompt: "Analyze the provided email subjects and snippets. Categorize them and highlight any urgent ones." }),
      createNode("output", "text-output", 700, 200),
    ],
    edges: [
      createEdge("gmail", "llm-triage"),
      createEdge("llm-triage", "output"),
    ],
  },
  "meeting-scheduler": {
    id: "meeting-scheduler",
    nodes: [
      createNode("contacts", "listContacts", 100, 200),
      createNode("schedule", "googleMeetSchedule", 400, 200, { summary: "Sync Meeting", durationMinutes: 30 }),
      createNode("output", "text-output", 700, 200),
    ],
    edges: [
      createEdge("contacts", "schedule"),
      createEdge("schedule", "output"),
    ],
  },
  "youtube-summarizer": {
    id: "youtube-summarizer",
    nodes: [
      createNode("video-input", "text-input", 100, 200, { text: "dQw4w9WgXcQ" }),
      createNode("youtube", "youtubeGetVideo", 400, 200),
      createNode("llm-summary", "llm-prompt", 700, 200, { systemPrompt: "Summarize the provided YouTube video transcript." }),
      createNode("output", "text-output", 1000, 200),
    ],
    edges: [
      createEdge("video-input", "youtube"),
      createEdge("youtube", "llm-summary"),
      createEdge("llm-summary", "output"),
    ],
  },
  "github-pr-creator": {
    id: "github-pr-creator",
    nodes: [
      createNode("repo-input", "text-input", 100, 200, { text: "owner/repo" }),
      createNode("github-commits", "githubListCommits", 400, 200),
      createNode("llm-pr", "llm-prompt", 700, 200, { systemPrompt: "Based on the recent commits, draft a detailed Pull Request description explaining the changes." }),
      createNode("output", "text-output", 1000, 200),
    ],
    edges: [
      createEdge("repo-input", "github-commits"),
      createEdge("github-commits", "llm-pr"),
      createEdge("llm-pr", "output"),
    ],
  },
};

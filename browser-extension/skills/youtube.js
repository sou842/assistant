// skills/youtube.js
// Skill specifically designed for YouTube interactions

if (self.SkillRegistry) {
  self.SkillRegistry.register({
    name: "YouTube",
    domain: /youtube\.com/,
    
    systemInstruction: `
CRITICAL YOUTUBE INSTRUCTIONS:
- You are operating on YouTube. 
- If the user asks to "play a video" or "search for something", use the 'type' and 'click' actions to search and select a video.
- To pause/play a video quickly, you can output an action that clicks the video player or presses the spacebar/k key if supported.
- If asked to 'skip ad', look for a button with text like "Skip" or "Skip Ads" and use the 'click' action on it.
- If asked to summarize the video, click the "Expand" or "...more" button in the description first to reveal text, then read it.
- Do NOT read the comments unless the user explicitly asks for comments or community opinions.
    `
  });
}

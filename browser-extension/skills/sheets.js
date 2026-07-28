// skills/sheets.js
// Skill designed for Google Sheets interactions

if (self.SkillRegistry) {
  self.SkillRegistry.register({
    name: "Google Sheets",
    domain: /docs\.google\.com\/spreadsheets/,
    
    systemInstruction: `
CRITICAL GOOGLE SHEETS INSTRUCTIONS:
- You are operating on Google Sheets.
- Spreadsheets render on a Canvas element, meaning individual cells are NOT visible in the DOM. Do NOT try to click or type into individual cell elements.
- READING DATA: If the user asks you to read or verify spreadsheet contents, you MUST use the "read_sheet" action first. This action will return the entire spreadsheet data in TSV format in your next step's action history.
- WRITING DATA: To fill out details or paste schedules, you MUST use the "paste_data" action.
  1. Format the data as a clean Tab-Separated Values (TSV) string (columns separated by '\\t', rows separated by '\\n').
  2. You MUST set the starting cell coordinate in the "cell" parameter (e.g. "A1", "B3") so the extension selects it automatically. Do NOT rely on the current user cursor.
- STOP CONDITION: Immediately after successfully executing a "paste_data" action, you MUST select the "finish" action on the very next step. Do NOT attempt to read the page or repeat the paste action. Your task is complete once the data is pasted.
    `
  });
}

export const VAULT_NOTE_GUIDELINES = `
Vault note content must use Editor.js block format.

Structure:
{
  "blocks": []
}

Supported blocks:

1. header
{
  "type": "header",
  "data": {
    "text": "Title",
    "level": 2
  }
}

2. paragraph
{
  "type": "paragraph",
  "data": {
    "text": "Content"
  }
}

3. list
{
  "type": "list",
  "data": {
    "style": "unordered",
    "items": ["Item 1", "Item 2"]
  }
}

4. checklist
{
  "type": "checklist",
  "data": {
    "items": [
      {
        "text": "Task",
        "checked": true
      }
    ]
  }
}

5. table
{
  "type": "table",
  "data": {
    "content": [
      ["Name", "Role"],
      ["Alice", "Developer"]
    ]
  }
}

6. code
{
  "type": "code",
  "data": {
    "code": "const x = 10;"
  }
}

7. delimiter
{
  "type": "delimiter",
  "data": {}
}

8. quote
{
  "type": "quote",
  "data": {
    "text": "Quote",
    "caption": "Author",
    "alignment": "left"
  }
}

9. warning
{
  "type": "warning",
  "data": {
    "title": "Important",
    "message": "Warning message"
  }
}

10. inlineImage
{
  "type": "inlineImage",
  "data": {
    "url": "https://images.unsplash.com/photo-1504609813442-a8924e83f76e",
    "caption": "Image",
    "withBorder": false,
    "withBackground": false,
    "stretched": false
  }
}

Image Rules:
- Always use high-quality real image URLs.
- Prefer Unsplash or Pexels images.
- Use topic-relevant images only.
- Avoid placeholder, fake, broken, blob, localhost, or base64 URLs.
- Never use "alt" in image data.
- Never use height and width in image data.

Correct URL examples:
- https://images.unsplash.com/photo-1504609813442-a8924e83f76e
- https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg

Text Formatting Rules:
- Inline HTML formatting is allowed inside text fields.
- Allowed tags:
  - <b>
  - <strong>
  - <i>
  - <em>
  - <u>
  - <mark>
  - <code>
  - <a href="https://example.com">

Example:
{
  "type": "paragraph",
  "data": {
    "text": "This is <b>bold</b>, <i>italic</i>, and <u>underlined</u> text."
  }
}

Rules:
- Use formatting meaningfully.
- Avoid excessive nested formatting.
- Links must use valid HTTPS URLs.
- Do not inject unsafe HTML/scripts.
- Only inline formatting is allowed.

General Rules:
- Return valid JSON only.
- Never use unsupported block types.
- Use proper block structure.
- Use notes for rich text, docs, plans, and content.
`;

const VAULT_SHEET_GUIDELINES = `
Vault spreadsheet content must be an array of objects.

Example:
[
  {
    "ID": "1",
    "Name": "Alice",
    "Role": "Developer"
  },
  {
    "ID": "2",
    "Name": "Bob",
    "Role": "Designer"
  }
]

Rules:
- Each object represents a row.
- Keys represent columns.
- Keep column names consistent across rows.
- Prefer flat structures.
- Use spreadsheets for structured/tabular data only.
- Return valid JSON only.
`;

export const VAULT_GUIDELINES = {
  VAULT_NOTE_GUIDELINES,
  VAULT_SHEET_GUIDELINES,
};

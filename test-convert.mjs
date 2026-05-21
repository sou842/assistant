import { convertToModelMessages } from 'ai';
const messages = [{ role: 'user', content: 'hello' }];
const normalizedMessages = messages.map(m => ({
  ...m,
  parts: m.parts || [{ type: 'text', text: String(m.content || '') }]
}));
const modelMessages = convertToModelMessages(normalizedMessages);
console.log('Success!', JSON.stringify(modelMessages, null, 2));

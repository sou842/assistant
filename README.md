# AI Assistant (Jarvis)

A powerful, multi-user, web-based AI assistant designed to act as a comprehensive personal sidekick. Built on the Next.js 15 App Router, this application integrates seamlessly with multiple LLM providers (OpenAI, Mistral, Gemini, DeepSeek) and acts as an intelligent operating system for your digital life.

## ✨ Key Features
- **Multi-User Authentication**: Robust security via NextAuth (Auth.js v5) and bcrypt, allowing multiple users to have perfectly isolated environments.
- **Persistent AI Memory**: The assistant proactively remembers facts, preferences, and context across sessions using a categorized memory structure.
- **The Vault**: A secure file system that natively handles:
  - Markdown Notes (powered by Editor.js)
  - Spreadsheets (interactive TanStack tables)
  - Media Galleries & Albums (automated image compression and Cloudinary storage)
- **Task & Schedule Management**: Create, update, and track tasks. Automate recurring workflows (like hourly weather checks or reminders) using the internal scheduling engine.
- **Deep Integrations**:
  - **GitHub API**: Let the AI read repositories, commits, and code directly.
  - **Google Workspace**: Read emails from Gmail, schedule meetings in Google Calendar, and generate Google Meet links.
  - **WhatsApp (Green API)**: Send text messages directly from the chat interface and manage your contacts.
  - **Browser Automation**: The AI can fetch live website data or even automate browser interactions.
- **Modern UI/UX**: Built with Tailwind CSS, Framer Motion, and DaisyUI. Offers a cinematic dark-mode experience with dynamic profile menus and interactive chat capabilities.

## 🛠️ Tech Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
- **Database**: MongoDB (via Mongoose)
- **Authentication**: NextAuth.js (Auth.js v5)
- **AI SDKs**: Vercel AI SDK (`@ai-sdk/react`)
- **Styling**: Tailwind CSS, Shadcn UI, DaisyUI, Framer Motion
- **Editors**: Editor.js (for Vault notes), TanStack Table (for Vault spreadsheets)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster
- API keys for integrations (OpenAI/Mistral/Gemini, Cloudinary, GitHub, Google, Green API)

### Environment Variables
Create a `.env.local` file and fill in:
```env
MONGODB_URI=your_mongodb_connection_string
AUTH_SECRET=your_random_nextauth_secret

# AI Providers
OPENAI_API_KEY=...
MISTRAL_API_KEY=...
GEMINI_API_KEY=...

# Integrations
GITHUB_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GREEN_API_ID_INSTANCE=...
CLOUDINARY_CLOUD_NAME=...
```

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## 🛡️ Architecture Highlights
- **Edge-Compatible Auth**: The middleware is highly optimized to run on the Edge runtime using a separated `auth.config.ts`, while heavier node dependencies (like bcrypt/mongoose) run in the Node runtime `auth.ts`.
- **Tool-Calling Engine**: The core `/api/chat/route.ts` is equipped with over 20 discrete tools, enabling the AI to securely map user queries to exact database operations and API calls, perfectly scoped to the authenticated `userId`.

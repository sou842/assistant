"use client";

import React from "react";
import {
  Layers,
  Menu,
  Calendar,
  MessageSquare,
  FileText,
  Database,
  ChevronRight,
  Columns,
  MessageCircle,
  Video,
  Music,
  Plus
} from "lucide-react";
import { useAI } from "../_components/ai-provider";

export default function IntegrationsPage() {
  const { setMobileSidebarOpen } = useAI();

const activeIntegrations = [
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg className="size-6 text-white" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
    connected: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: (
      <img src="https://www.google.com/favicon.ico" className="size-6 object-contain" alt="Gmail" />
    ),
    connected: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: (
      <img src="https://cdn-icons-png.flaticon.com/128/4423/4423697.png" className="size-6 object-contain" alt="WhatsApp" />
    ),
    connected: true,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar / Meet',
    icon: (
      <img
        src="https://meet.google.com/favicon.ico"
        className="size-6 object-contain"
        alt="Google Calendar / Meet"
      />
    ),
    connected: true,
  }
];

const pendingIntegrations = [
  {
    id: 'slack',
    name: 'Slack',
    icon: (
      <img
        src="https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png"
        className="size-6 object-contain"
        alt="Slack"
      />
    ),
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: (
      <img
        src="https://www.notion.so/images/logo-ios.png"
        className="size-6 object-contain"
        alt="Notion"
      />
    ),
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: (
      <img
        src="https://www.airtable.com/images/favicon/baymax/apple-touch-icon.png"
        className="size-6 object-contain"
        alt="Airtable"
      />
    ),
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: (
      <img
        src="https://trello.com/favicon.ico"
        className="size-6 object-contain"
        alt="Trello"
      />
    ),
  },
  {
    id: 'zoom',
    name: 'Zoom',
    icon: (
      <img
        src="https://st1.zoom.us/zoom.ico"
        className="size-6 object-contain"
        alt="Zoom"
      />
    ),
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: (
      <img
        src="https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png"
        className="size-6 object-contain"
        alt="Spotify"
      />
    ),
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: (
      <img
        src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
        className="size-6 object-contain"
        alt="Jira"
      />
    ),
  },
];

  return (
    <div className="min-h-screen bg-black">
      <header className="w-full h-16 sticky top-0 z-30 border-b border-white/5 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto max-w-8xl px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden size-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Layers className="size-4 text-white/70" />
              </div>
              <h1 className="text-lg font-medium text-white tracking-tight">Integrations</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full overflow-y-auto">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-white/5">
          {/* Active Integrations */}
          {activeIntegrations.map((item) => (
            <div
              key={item.id}
              className="group p-8 border-r border-b border-white/5 hover:bg-white/3 transition-all duration-300 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="size-14 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/5 transition-all duration-300 shadow-2xl">
                    {item.icon}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white tracking-tight group-hover:text-white transition-colors">{item.name}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Pending Integrations */}
          {pendingIntegrations.map((item) => (
            <div
              key={item.name}
              className="group p-8 border-r border-b border-white/5 hover:bg-white/2 transition-all duration-300 flex items-center justify-between cursor-pointer opacity-40 grayscale hover:grayscale-0 hover:opacity-100"
            >
              <div className="flex items-center gap-6">
                <div className="size-14 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-all duration-300">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white/60 tracking-tight">{item.name}</span>
                  <span className="text-xs text-white/20 font-medium">Coming Soon</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

function IntegrationStatus() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  if (!success && !error) return null;

  return (
    <div className="px-6 py-4">
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-app-success-border bg-app-success-soft p-4">
          <span className="text-app-success-foreground">GitHub connected successfully!</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-app-danger-border bg-app-danger-soft p-4">
          <span className="text-app-danger-foreground">Failed to connect GitHub. Please try again.</span>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { setMobileSidebarOpen } = useAI();

const activeIntegrations = [
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg className="size-6 text-app-text-primary" viewBox="0 0 16 16" fill="currentColor">
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
    <div className="min-h-screen bg-app-canvas">
      <header className="sticky top-0 z-30 h-16 w-full border-b border-app-border-subtle bg-app-canvas/70 backdrop-blur-xl">
        <div className="mx-auto max-w-8xl px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden flex size-10 items-center justify-center rounded-xl border border-app-border-default bg-app-surface-glass text-app-text-primary"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg border border-app-border-default bg-app-surface-glass">
                <Layers className="size-4 text-app-text-soft" />
              </div>
              <h1 className="text-lg font-medium tracking-tight text-app-text-primary">Integrations</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full overflow-y-auto">
        <Suspense fallback={null}>
          <IntegrationStatus />
        </Suspense>

        <div className="grid w-full grid-cols-1 border-app-border-subtle md:grid-cols-2 lg:grid-cols-3">
          {/* Active Integrations */}
          {activeIntegrations.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.id === 'github') {
                  window.location.href = "/api/integrations/github/connect";
                }
              }}
              className="group flex cursor-pointer items-center justify-between border-r border-b border-app-border-subtle p-8 transition-all duration-300 hover:bg-app-surface-glass-soft"
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-app-border-default bg-app-surface-glass-soft shadow-2xl transition-all duration-300 group-hover:border-app-border-strong group-hover:bg-app-surface-glass">
                    {item.icon}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold tracking-tight text-app-text-primary transition-colors group-hover:text-app-text-primary">{item.name}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Pending Integrations */}
          {pendingIntegrations.map((item) => (
            <div
              key={item.name}
              className="group flex cursor-pointer items-center justify-between border-r border-b border-app-border-subtle p-8 opacity-40 grayscale transition-all duration-300 hover:bg-app-surface-glass-faint hover:grayscale-0 hover:opacity-100"
            >
              <div className="flex items-center gap-6">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-app-border-subtle bg-app-surface-glass-faint transition-all duration-300 group-hover:border-app-border-strong">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold tracking-tight text-app-text-soft">{item.name}</span>
                  <span className="text-xs font-medium text-app-text-ghost">Coming Soon</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

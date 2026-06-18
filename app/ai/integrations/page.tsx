"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Layers, Menu, Radio } from "lucide-react";

import { useAI } from "../_components/ai-provider";

type Integration = {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected?: boolean;
  comingSoon?: boolean;
};

function IntegrationStatus() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const googleSuccess = searchParams.get("google") === "success";
    const googleError = searchParams.get("google") === "error";

    if (success) {
      toast.success("GitHub connected successfully!");
      router.replace("/ai/integrations");
    }

    if (error) {
      toast.error("Failed to connect GitHub. Please try again.");
      router.replace("/ai/integrations");
    }

    if (googleSuccess) {
      toast.success("Google connected successfully!");
      router.replace("/ai/integrations");
    }

    if (googleError) {
      toast.error("Failed to connect Google. Please try again.");
      router.replace("/ai/integrations");
    }
  }, [searchParams, router]);

  return null;
}

function IntegrationCard({
  item,
  githubConnected,
  googleConnected,
  leetcodeConnected,
  onGithubConnect,
  onGithubDisconnect,
  onGoogleConnect,
  onGoogleDisconnect,
  onLeetcodeConnect,
  onLeetcodeDisconnect,
}: {
  item: Integration;
  githubConnected: boolean;
  googleConnected: boolean;
  leetcodeConnected: boolean;
  onGithubConnect: () => void;
  onGithubDisconnect: () => void;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  onLeetcodeConnect: () => void;
  onLeetcodeDisconnect: () => void;
}) {
  const isGithub = item.id === "github";
  const isGoogle = item.id === "google";
  const isLeetcode = item.id === "leetcode";
  
  let isConnected = item.connected;
  if (isGithub) isConnected = githubConnected;
  if (isGoogle) isConnected = googleConnected;
  if (isLeetcode) isConnected = leetcodeConnected;

  const handleCardClick = () => {
    if (item.comingSoon) return;

    if (isGithub && !githubConnected) {
      onGithubConnect();
    } else if (isGoogle && !googleConnected) {
      onGoogleConnect();
    } else if (isLeetcode && !leetcodeConnected) {
      onLeetcodeConnect();
    }
  };

  const isInteractive = (isGithub && !githubConnected) || (isGoogle && !googleConnected) || (isLeetcode && !leetcodeConnected);

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex items-center justify-between border-r border-b border-app-border-subtle p-8 transition-all duration-300 ${item.comingSoon
        ? "group opacity-40 grayscale hover:bg-app-surface-glass-faint hover:grayscale-0 hover:opacity-100"
        : "group hover:bg-app-surface-glass-soft"
        } ${isInteractive ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-6">
        <div
          className={`flex size-14 items-center justify-center rounded-2xl border shadow-2xl transition-all duration-300 group-hover:border-app-border-strong ${item.comingSoon
            ? "border-app-border-subtle bg-app-surface-glass-faint"
            : isConnected
              ? "border-app-success-border/50 bg-app-success-soft/20"
              : "border-app-border-default bg-app-surface-glass-soft group-hover:bg-app-surface-glass"
            }`}
        >
          {item.icon}
        </div>

        <div className="flex flex-col">
          <span
            className={`text-base font-semibold tracking-tight ${item.comingSoon
              ? "text-app-text-soft"
              : "text-app-text-primary"
              }`}
          >
            {item.name}
          </span>

          {item.comingSoon ? (
            <span className="text-xs font-medium text-app-text-ghost">
              Coming Soon
            </span>
          ) : (
            <span
              className={`mt-1 text-xs transition-colors ${isConnected
                ? "text-app-success-foreground"
                : "text-app-text-muted group-hover:text-app-text-primary"
                }`}
            >
              {isConnected ? "Connected" : "Click to connect"}
            </span>
          )}
        </div>
      </div>

      {(isGithub || isGoogle || isLeetcode) && (
        <button
          onClick={(e) => {
            e.stopPropagation();

            if (isGithub) {
              if (githubConnected) onGithubDisconnect();
              else onGithubConnect();
            } else if (isGoogle) {
              if (googleConnected) onGoogleDisconnect();
              else onGoogleConnect();
            } else if (isLeetcode) {
              if (leetcodeConnected) onLeetcodeDisconnect();
              else onLeetcodeConnect();
            }
          }}
          title={isConnected ? `Disconnect ${item.name}` : `Connect ${item.name}`}
          className="absolute top-2 right-4 -mr-2 rounded-full p-2 transition-colors hover:bg-app-surface-glass cursor-pointer"
        >
          {isConnected && (
            <Radio className="size-5 text-app-success-foreground transition-colors hover:text-app-danger-foreground" />
          )}
        </button>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { setMobileSidebarOpen } = useAI();

  const [githubConnected, setGithubConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [leetcodeConnected, setLeetcodeConnected] = useState(false);
  const [showLeetcodeDialog, setShowLeetcodeDialog] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [isConnectingLeetcode, setIsConnectingLeetcode] = useState(false);

  useEffect(() => {
    const fetchGithubStatus = async () => {
      try {
        const response = await fetch("/api/integrations/github/status");
        const data = await response.json();
        setGithubConnected(data.connected);
      } catch (error) {
        console.error("Failed to fetch GitHub status:", error);
      }
    };

    const fetchGoogleStatus = async () => {
      try {
        const response = await fetch("/api/integrations/google/status");
        const data = await response.json();
        setGoogleConnected(data.connected);
      } catch (error) {
        console.error("Failed to fetch Google status:", error);
      }
    };

    const fetchLeetcodeStatus = async () => {
      try {
        const response = await fetch("/api/integrations/leetcode/status");
        const data = await response.json();
        setLeetcodeConnected(data.connected);
      } catch (error) {
        console.error("Failed to fetch LeetCode status:", error);
      }
    };

    fetchGithubStatus();
    fetchGoogleStatus();
    fetchLeetcodeStatus();
  }, []);

  const connectGithub = () => {
    window.location.href = "/api/integrations/github/connect";
  };

  const disconnectGithub = async () => {
    try {
      await fetch("/api/integrations/github/disconnect", { method: "POST" });
      setGithubConnected(false);
      toast.success("GitHub disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect GitHub");
    }
  };

  const connectGoogle = () => {
    window.location.href = "/api/integrations/google/connect";
  };

  const disconnectGoogle = async () => {
    try {
      await fetch("/api/integrations/google/disconnect", { method: "POST" });
      setGoogleConnected(false);
      toast.success("Google disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect Google");
    }
  };

  const connectLeetcode = () => {
    setShowLeetcodeDialog(true);
  };

  const submitLeetcode = async () => {
    if (!leetcodeUsername) return;
    setIsConnectingLeetcode(true);
    try {
      const res = await fetch("/api/integrations/leetcode/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: leetcodeUsername }),
      });
      if (!res.ok) throw new Error("Failed");
      setLeetcodeConnected(true);
      setShowLeetcodeDialog(false);
      setLeetcodeUsername("");
      toast.success("LeetCode connected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect LeetCode");
    } finally {
      setIsConnectingLeetcode(false);
    }
  };

  const disconnectLeetcode = async () => {
    try {
      await fetch("/api/integrations/leetcode/disconnect", { method: "POST" });
      setLeetcodeConnected(false);
      toast.success("LeetCode disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect LeetCode");
    }
  };

  const activeIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "github",
        name: "GitHub",
        icon: (
          <svg
            className="size-6 text-app-text-primary"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        ),
      },
      {
        id: "google",
        name: "Google Workspace",
        icon: (
          <img
            src="https://www.google.com/favicon.ico"
            className="size-6 object-contain"
            alt="Google Workspace"
          />
        ),
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        connected: true,
        icon: (
          <img
            src="https://cdn-icons-png.flaticon.com/128/4423/4423697.png"
            className="size-6 object-contain"
            alt="WhatsApp"
          />
        ),
      },
      {
        id: "leetcode",
        name: "LeetCode",
        icon: (
          <img
            src="https://leetcode.com/favicon.ico"
            className="size-6 object-contain dark:invert"
            alt="LeetCode"
          />
        ),
      },
    ],
    []
  );

  const pendingIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "slack",
        name: "Slack",
        comingSoon: true,
        icon: (
          <img
            src="https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png"
            className="size-6 object-contain"
            alt="Slack"
          />
        ),
      },
      {
        id: "notion",
        name: "Notion",
        comingSoon: true,
        icon: (
          <img
            src="https://www.notion.so/images/logo-ios.png"
            className="size-6 object-contain"
            alt="Notion"
          />
        ),
      },
      {
        id: "airtable",
        name: "Airtable",
        comingSoon: true,
        icon: (
          <img
            src="https://www.airtable.com/images/favicon/baymax/apple-touch-icon.png"
            className="size-6 object-contain"
            alt="Airtable"
          />
        ),
      },
      {
        id: "trello",
        name: "Trello",
        comingSoon: true,
        icon: (
          <img
            src="https://trello.com/favicon.ico"
            className="size-6 object-contain"
            alt="Trello"
          />
        ),
      },
      {
        id: "zoom",
        name: "Zoom",
        comingSoon: true,
        icon: (
          <img
            src="https://st1.zoom.us/zoom.ico"
            className="size-6 object-contain"
            alt="Zoom"
          />
        ),
      },
      {
        id: "spotify",
        name: "Spotify",
        comingSoon: true,
        icon: (
          <img
            src="https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png"
            className="size-6 object-contain"
            alt="Spotify"
          />
        ),
      },
      {
        id: "jira",
        name: "Jira",
        comingSoon: true,
        icon: (
          <img
            src="https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
            className="size-6 object-contain"
            alt="Jira"
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-app-canvas">
      <header className="sticky top-0 z-30 h-16 w-full border-b border-app-border-subtle bg-app-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-8xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl border border-app-border-default bg-app-surface-glass text-app-text-primary md:hidden"
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg border border-app-border-default bg-app-surface-glass">
                <Layers className="size-4 text-app-text-soft" />
              </div>

              <h1 className="text-lg font-medium tracking-tight text-app-text-primary">
                Integrations
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full overflow-y-auto">
        <Suspense fallback={null}>
          <IntegrationStatus />
        </Suspense>

        <div className="grid w-full grid-cols-1 border-app-border-subtle md:grid-cols-2 lg:grid-cols-3">
          {[...activeIntegrations, ...pendingIntegrations].map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              githubConnected={githubConnected}
              googleConnected={googleConnected}
              leetcodeConnected={leetcodeConnected}
              onGithubConnect={connectGithub}
              onGithubDisconnect={disconnectGithub}
              onGoogleConnect={connectGoogle}
              onGoogleDisconnect={disconnectGoogle}
              onLeetcodeConnect={connectLeetcode}
              onLeetcodeDisconnect={disconnectLeetcode}
            />
          ))}
        </div>

        {showLeetcodeDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-app-canvas p-6 shadow-2xl border border-app-border-subtle">
              <h2 className="text-xl font-semibold text-app-text-primary mb-2">Connect LeetCode</h2>
              <p className="text-sm text-app-text-soft mb-6">
                Enter your LeetCode username to allow Jarvis to access your public statistics and submissions.
              </p>
              
              <div className="mb-6">
                <label htmlFor="username" className="block text-sm font-medium text-app-text-primary mb-2">
                  LeetCode Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={leetcodeUsername}
                  onChange={(e) => setLeetcodeUsername(e.target.value)}
                  className="w-full rounded-full border border-app-border-default bg-app-surface-glass px-4 py-2 text-sm text-app-text-primary focus:border-app-border-strong focus:outline-none"
                  placeholder="e.g. vG0FY1V5T2"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLeetcodeDialog(false)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-app-text-soft hover:bg-app-surface-glass hover:text-app-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitLeetcode}
                  disabled={!leetcodeUsername || isConnectingLeetcode}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary transition-colors disabled:opacity-50"
                >
                  {isConnectingLeetcode ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
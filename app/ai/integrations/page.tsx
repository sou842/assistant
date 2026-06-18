"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Layers, Menu, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useAI } from "../_components/ai-provider";

type Integration = {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected?: boolean;
  comingSoon?: boolean;
};

function ConnectionDialog({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  isSubmitting,
  submitLabel = "Connect",
  submittingLabel = "Connecting...",
  disableSubmit = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  disableSubmit?: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-app-surface-elevated border-app-border-subtle shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-app-text-primary mb-2">{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {children}
        </div>

        <DialogFooter className="mt-0 gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full text-app-text-soft hover:bg-app-surface-glass hover:text-app-text-primary"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={disableSubmit || isSubmitting}
            className="rounded-full bg-blue-600 hover:bg-brand-primary text-white"
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  telegramConnected,
  devtoConnected,
  onGithubConnect,
  onGithubDisconnect,
  onGoogleConnect,
  onGoogleDisconnect,
  onLeetcodeConnect,
  onLeetcodeDisconnect,
  onTelegramConnect,
  onTelegramDisconnect,
  onDevtoConnect,
  onDevtoDisconnect,
}: {
  item: Integration;
  githubConnected: boolean;
  googleConnected: boolean;
  leetcodeConnected: boolean;
  telegramConnected: boolean;
  devtoConnected: boolean;
  onGithubConnect: () => void;
  onGithubDisconnect: () => void;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  onLeetcodeConnect: () => void;
  onLeetcodeDisconnect: () => void;
  onTelegramConnect: () => void;
  onTelegramDisconnect: () => void;
  onDevtoConnect: () => void;
  onDevtoDisconnect: () => void;
}) {
  const isGithub = item.id === "github";
  const isGoogle = item.id === "google";
  const isLeetcode = item.id === "leetcode";
  const isTelegram = item.id === "telegram";
  const isDevto = item.id === "devto";

  let isConnected = item.connected;
  if (isGithub) isConnected = githubConnected;
  if (isGoogle) isConnected = googleConnected;
  if (isLeetcode) isConnected = leetcodeConnected;
  if (isTelegram) isConnected = telegramConnected;
  if (isDevto) isConnected = devtoConnected;

  const handleCardClick = () => {
    if (item.comingSoon) return;

    if (isGithub && !githubConnected) {
      onGithubConnect();
    } else if (isGoogle && !googleConnected) {
      onGoogleConnect();
    } else if (isLeetcode && !leetcodeConnected) {
      onLeetcodeConnect();
    } else if (isTelegram && !telegramConnected) {
      onTelegramConnect();
    } else if (isDevto && !devtoConnected) {
      onDevtoConnect();
    }
  };

  const isInteractive = (isGithub && !githubConnected) || (isGoogle && !googleConnected) || (isLeetcode && !leetcodeConnected) || (isTelegram && !telegramConnected) || (isDevto && !devtoConnected);

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

      {(isGithub || isGoogle || isLeetcode || isTelegram || isDevto) && (
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
            } else if (isTelegram) {
              if (telegramConnected) onTelegramDisconnect();
              else onTelegramConnect();
            } else if (isDevto) {
              if (devtoConnected) onDevtoDisconnect();
              else onDevtoConnect();
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
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [showTelegramDialog, setShowTelegramDialog] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);
  const [devtoConnected, setDevtoConnected] = useState(false);
  const [showDevtoDialog, setShowDevtoDialog] = useState(false);
  const [devtoApiKey, setDevtoApiKey] = useState("");
  const [isConnectingDevto, setIsConnectingDevto] = useState(false);

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

    const fetchTelegramStatus = async () => {
      try {
        const response = await fetch("/api/integrations/telegram/status");
        const data = await response.json();
        setTelegramConnected(data.isConnected);
      } catch (error) {
        console.error("Failed to fetch Telegram status:", error);
      }
    };

    const fetchDevtoStatus = async () => {
      try {
        const response = await fetch("/api/integrations/devto/status");
        const data = await response.json();
        setDevtoConnected(data.connected);
      } catch (error) {
        console.error("Failed to fetch Dev.to status:", error);
      }
    };

    fetchGithubStatus();
    fetchGoogleStatus();
    fetchLeetcodeStatus();
    fetchTelegramStatus();
    fetchDevtoStatus();
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

  const connectTelegram = () => {
    setShowTelegramDialog(true);
  };

  const submitTelegram = async () => {
    if (!telegramChatId) return;
    setIsConnectingTelegram(true);
    try {
      const res = await fetch("/api/integrations/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: telegramChatId }),
      });
      if (!res.ok) throw new Error("Failed");
      setTelegramConnected(true);
      setShowTelegramDialog(false);
      setTelegramChatId("");
      toast.success("Telegram connected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect Telegram");
    } finally {
      setIsConnectingTelegram(false);
    }
  };

  const disconnectTelegram = async () => {
    try {
      await fetch("/api/integrations/telegram/disconnect", { method: "POST" });
      setTelegramConnected(false);
      toast.success("Telegram disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect Telegram");
    }
  };

  const connectDevto = () => setShowDevtoDialog(true);
  
  const submitDevto = async () => {
    if (!devtoApiKey) return;
    setIsConnectingDevto(true);
    try {
      const res = await fetch("/api/integrations/devto/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: devtoApiKey }),
      });
      if (!res.ok) throw new Error("Failed");
      setDevtoConnected(true);
      setShowDevtoDialog(false);
      setDevtoApiKey("");
      toast.success("Dev.to connected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect Dev.to");
    } finally {
      setIsConnectingDevto(false);
    }
  };

  const disconnectDevto = async () => {
    try {
      await fetch("/api/integrations/devto/disconnect", { method: "POST" });
      setDevtoConnected(false);
      toast.success("Dev.to disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect Dev.to");
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
      {
        id: "telegram",
        name: "Telegram",
        icon: (
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
            className="size-6 object-contain"
            alt="Telegram"
          />
        ),
      },
      {
        id: "devto",
        name: "Dev.to",
        icon: (
          <img
            src="https://dev-to-uploads.s3.amazonaws.com/uploads/logos/resized_logo_UQww2soKuUsjaOGNB38o.png"
            className="size-6 object-contain dark:invert"
            alt="Dev.to"
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
              telegramConnected={telegramConnected}
              devtoConnected={devtoConnected}
              onGithubConnect={connectGithub}
              onGithubDisconnect={disconnectGithub}
              onGoogleConnect={connectGoogle}
              onGoogleDisconnect={disconnectGoogle}
              onLeetcodeConnect={connectLeetcode}
              onLeetcodeDisconnect={disconnectLeetcode}
              onTelegramConnect={connectTelegram}
              onTelegramDisconnect={disconnectTelegram}
              onDevtoConnect={connectDevto}
              onDevtoDisconnect={disconnectDevto}
            />
          ))}
        </div>

        <ConnectionDialog
          isOpen={showLeetcodeDialog}
          onClose={() => setShowLeetcodeDialog(false)}
          title="Connect LeetCode"
          onSubmit={submitLeetcode}
          isSubmitting={isConnectingLeetcode}
          disableSubmit={!leetcodeUsername}
        >
          <p className="text-sm text-app-text-soft mb-6">
            Enter your LeetCode username to allow Jarvis to access your public statistics and submissions.
          </p>

          <div>
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
        </ConnectionDialog>

        <ConnectionDialog
          isOpen={showTelegramDialog}
          onClose={() => setShowTelegramDialog(false)}
          title="Connect Telegram"
          onSubmit={submitTelegram}
          isSubmitting={isConnectingTelegram}
          disableSubmit={!telegramChatId}
        >
          <div>
            <label htmlFor="chatId" className="block text-sm font-medium text-app-text-primary mb-2">
              Telegram Chat ID
            </label>
            <input
              id="chatId"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-full rounded-full border border-app-border-default bg-app-surface-glass px-4 py-2 text-sm text-app-text-primary focus:border-app-border-strong focus:outline-none"
              placeholder="e.g. 123456789"
              autoFocus
            />
          </div>

          <div className="mt-6 rounded-xl bg-app-canvas border border-app-border-subtle p-4">
            <h3 className="text-sm font-medium text-app-text-primary mb-2">How to find your Chat ID:</h3>
            <ol className="list-decimal list-inside text-sm text-app-text-soft space-y-2 mb-3">
              <li>Open Telegram and search for <strong className="text-app-text-primary">@userinfobot</strong></li>
              <li>Start a chat ( or send <code className="bg-app-surface-glass px-1.5 py-0.5 mr-0.5 rounded-full text-xs text-app-text-primary border border-app-border-subtle">/start</code>)</li>
              <li>Copy the number next to <strong className="text-app-text-primary">Id:</strong></li>
            </ol>
            <div className="pt-3 border-t border-app-border-subtle/50">
              <p className="text-xs text-app-text-muted">
                Or open it directly on the web:
                <a
                  target="_blank"
                  href="https://t.me/userinfobot"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline ml-1 font-medium transition-colors">
                  t.me/userinfobot
                </a>
              </p>
            </div>
          </div>
        </ConnectionDialog>

        <ConnectionDialog
          isOpen={showDevtoDialog}
          onClose={() => setShowDevtoDialog(false)}
          title="Connect Dev.to"
          onSubmit={submitDevto}
          isSubmitting={isConnectingDevto}
          disableSubmit={!devtoApiKey}
        >
          <div className="mb-6 mt-4 rounded-xl bg-app-canvas border border-app-border-subtle p-4">
            <h3 className="text-sm font-medium text-app-text-primary mb-2">How to find your API Key:</h3>
            <ol className="list-decimal list-inside text-sm text-app-text-soft space-y-2 mb-3">
              <li>Log in to your <strong className="text-app-text-primary">Dev.to</strong> account</li>
              <li>Go to <strong className="text-app-text-primary">Settings &gt; Extensions</strong></li>
              <li>Generate a new <strong className="text-app-text-primary">API Key</strong> and copy it</li>
            </ol>
            <div className="pt-3 border-t border-app-border-subtle/50">
              <p className="text-xs text-app-text-muted">
                Or open settings directly:
                <a
                  target="_blank"
                  href="https://dev.to/settings/extensions"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline ml-1 font-medium transition-colors">
                  dev.to/settings
                </a>
              </p>
            </div>
          </div>
          
          <div>
            <label htmlFor="devtoApiKey" className="block text-sm font-medium text-app-text-primary mb-2">
              Dev.to API Key
            </label>
            <input
              id="devtoApiKey"
              type="text"
              value={devtoApiKey}
              onChange={(e) => setDevtoApiKey(e.target.value)}
              className="w-full rounded-full border border-app-border-default bg-app-surface-glass px-4 py-2 text-sm text-app-text-primary focus:border-app-border-strong focus:outline-none"
              placeholder="e.g. j7x2k..."
              autoFocus
            />
          </div>
        </ConnectionDialog>
      </main>
    </div>
  );
}
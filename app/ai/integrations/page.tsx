"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Cable, Menu, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-app-surface border border-transparent shadow-2xl rounded-2xl outline-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-app-text-primary tracking-tight">{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {children}
        </div>

        <DialogFooter className="mt-0 gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full text-app-text-muted hover:bg-app-surface-glass hover:text-app-text-primary text-[13px] font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={disableSubmit || isSubmitting}
            className="rounded-full bg-app-text-primary text-app-surface hover:bg-app-text-secondary text-[13px] font-medium transition shadow-sm"
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

import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Unlink } from "lucide-react";

function IntegrationCard({
  item,
  isConnected,
  onToggle,
}: {
  item: Integration;
  isConnected: boolean;
  onToggle: () => void;
}) {
  const isInteractive = !item.comingSoon;

  return (
    <div
      onClick={() => isInteractive && !isConnected && onToggle()}
      className={cn(
        "relative flex items-center justify-between bg-app-surface border border-transparent shadow-xs hover:shadow-sm hover:bg-app-surface-hover rounded-2xl p-6 transition-all duration-300",
        item.comingSoon && "opacity-45 grayscale",
        isInteractive && !isConnected && "cursor-pointer"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-full border border-transparent transition-all duration-300",
            isConnected 
              ? "bg-app-success-soft/10 text-app-success-foreground" 
              : "bg-app-surface-elevated text-app-text-muted"
          )}
        >
          {item.icon}
        </div>

        <div className="flex flex-col">
          <span
            className={cn(
              "text-[14px] font-semibold tracking-tight",
              item.comingSoon ? "text-app-text-muted" : "text-app-text-primary"
            )}
          >
            {item.name}
          </span>

          {item.comingSoon ? (
            <span className="text-[10px] font-medium text-app-text-ghost mt-0.5">
              Coming Soon
            </span>
          ) : (
            <span
              className={cn(
                "mt-0.5 text-xs font-medium transition-colors",
                isConnected ? "text-app-success-foreground" : "text-app-text-muted"
              )}
            >
              {isConnected ? "Connected" : "Click to connect"}
            </span>
          )}
        </div>
      </div>
      {!item.comingSoon && (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-full hover:bg-app-surface-elevated text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer outline-none">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-app-surface border border-app-border-default/20 rounded-xl">
                <DropdownMenuItem 
                  onClick={onToggle}
                  className="text-app-danger-strong hover:bg-app-danger-soft focus:bg-app-danger-soft focus:text-app-danger-strong cursor-pointer text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-2"
                >
                  <Unlink size={13} />
                  <span>Disconnect</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-full bg-app-surface-elevated hover:bg-app-surface-glass text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer outline-none"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IntegrationsPage() {
  const { setMobileSidebarOpen } = useAI();

  const { data: githubData, mutate: mutateGithub } = useSWR("/api/integrations/github/status", fetcher);
  const { data: googleData, mutate: mutateGoogle } = useSWR("/api/integrations/google/status", fetcher);
  const { data: leetcodeData, mutate: mutateLeetcode } = useSWR("/api/integrations/leetcode/status", fetcher);
  const { data: telegramData, mutate: mutateTelegram } = useSWR("/api/integrations/telegram/status", fetcher);
  const { data: devtoData, mutate: mutateDevto } = useSWR("/api/integrations/devto/status", fetcher);
  const { data: notionData, mutate: mutateNotion } = useSWR("/api/integrations/notion/status", fetcher);

  const githubConnected = githubData?.connected || false;
  const googleConnected = googleData?.connected || false;
  const leetcodeConnected = leetcodeData?.connected || false;
  const telegramConnected = telegramData?.isConnected || false;
  const devtoConnected = devtoData?.connected || false;
  const notionConnected = notionData?.connected || false;

  const [showLeetcodeDialog, setShowLeetcodeDialog] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [isConnectingLeetcode, setIsConnectingLeetcode] = useState(false);
  const [showTelegramDialog, setShowTelegramDialog] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);
  const [showDevtoDialog, setShowDevtoDialog] = useState(false);
  const [devtoApiKey, setDevtoApiKey] = useState("");
  const [isConnectingDevto, setIsConnectingDevto] = useState(false);

  const connectGithub = () => {
    window.location.href = "/api/integrations/github/connect";
  };

  const disconnectGithub = async () => {
    try {
      await fetch("/api/integrations/github/disconnect", { method: "POST" });
      mutateGithub();
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
      mutateGoogle();
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
      mutateLeetcode();
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
      mutateLeetcode();
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
      mutateTelegram();
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
      mutateTelegram();
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
      mutateDevto();
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
      mutateDevto();
      toast.success("Dev.to disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect Dev.to");
    }
  };

  const connectNotion = () => {
    window.location.href = "/api/integrations/notion/connect";
  };

  const disconnectNotion = async () => {
    try {
      await fetch("/api/integrations/notion/disconnect", { method: "POST" });
      mutateNotion();
      toast.success("Notion disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect Notion");
    }
  };

  const activeIntegrations: Integration[] = useMemo(
    () => [
      {
        id: "github",
        name: "GitHub",
        icon: (
          <svg
            className="size-5 text-app-text-primary"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain dark:invert"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain dark:invert"
            alt="Dev.to"
          />
        ),
      },
      {
        id: "notion",
        name: "Notion",
        icon: (
          <img
            src="https://www.notion.so/images/logo-ios.png"
            className="size-5 object-contain"
            alt="Notion"
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
            className="size-5 object-contain"
            alt="Slack"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain"
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
            className="size-5 object-contain"
            alt="Jira"
          />
        ),
      },
    ],
    []
  );

  const allIntegrations = useMemo(() => [...activeIntegrations, ...pendingIntegrations], [activeIntegrations, pendingIntegrations]);

  const connectedIntegrations = useMemo(() => {
    return allIntegrations.filter((item) => {
      if (item.id === "github") return githubConnected;
      if (item.id === "google") return googleConnected;
      if (item.id === "leetcode") return leetcodeConnected;
      if (item.id === "telegram") return telegramConnected;
      if (item.id === "devto") return devtoConnected;
      if (item.id === "notion") return notionConnected;
      return item.connected || false;
    });
  }, [allIntegrations, githubConnected, googleConnected, leetcodeConnected, telegramConnected, devtoConnected, notionConnected]);

  const availableIntegrations = useMemo(() => {
    return allIntegrations.filter((item) => {
      let isConnected = item.connected || false;
      if (item.id === "github") isConnected = githubConnected;
      if (item.id === "google") isConnected = googleConnected;
      if (item.id === "leetcode") isConnected = leetcodeConnected;
      if (item.id === "telegram") isConnected = telegramConnected;
      if (item.id === "devto") isConnected = devtoConnected;
      if (item.id === "notion") isConnected = notionConnected;
      return !isConnected;
    });
  }, [allIntegrations, githubConnected, googleConnected, leetcodeConnected, telegramConnected, devtoConnected, notionConnected]);

  const handleToggle = (item: Integration) => {
    const isGithub = item.id === "github";
    const isGoogle = item.id === "google";
    const isLeetcode = item.id === "leetcode";
    const isTelegram = item.id === "telegram";
    const isDevto = item.id === "devto";
    const isNotion = item.id === "notion";

    let isConnected = item.connected || false;
    if (isGithub) isConnected = githubConnected;
    if (isGoogle) isConnected = googleConnected;
    if (isLeetcode) isConnected = leetcodeConnected;
    if (isTelegram) isConnected = telegramConnected;
    if (isDevto) isConnected = devtoConnected;
    if (isNotion) isConnected = notionConnected;

    if (isConnected) {
      if (isGithub) disconnectGithub();
      else if (isGoogle) disconnectGoogle();
      else if (isLeetcode) disconnectLeetcode();
      else if (isTelegram) disconnectTelegram();
      else if (isDevto) disconnectDevto();
      else if (isNotion) disconnectNotion();
    } else {
      if (isGithub) connectGithub();
      else if (isGoogle) connectGoogle();
      else if (isLeetcode) connectLeetcode();
      else if (isTelegram) connectTelegram();
      else if (isDevto) connectDevto();
      else if (isNotion) connectNotion();
    }
  };

  return (
    <div className="min-h-screen bg-app-canvas">
      <header className="sticky top-0 z-30 h-16 w-full backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-8xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl bg-app-surface-elevated text-app-text-primary md:hidden"
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-app-surface-elevated">
                <Cable className="size-4 text-brand-primary" />
              </div>

              <h1 className="text-base font-semibold tracking-tight text-app-text-primary">
                Integrations
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full overflow-y-auto max-w-7xl mx-auto px-6 py-10">
        <Suspense fallback={null}>
          <IntegrationStatus />
        </Suspense>

        <div className="space-y-10">
          {connectedIntegrations.length > 0 && (
            <div>
              <h2 className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-4">Connected</h2>
              <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {connectedIntegrations.map((item) => (
                  <IntegrationCard
                    key={item.id}
                    item={item}
                    isConnected={true}
                    onToggle={() => handleToggle(item)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider mb-4">
              {connectedIntegrations.length > 0 ? "Available Integrations" : "All Integrations"}
            </h2>
            <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableIntegrations.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  isConnected={false}
                  onToggle={() => handleToggle(item)}
                />
              ))}
            </div>
          </div>
        </div>

        <ConnectionDialog
          isOpen={showLeetcodeDialog}
          onClose={() => setShowLeetcodeDialog(false)}
          title="Connect LeetCode"
          onSubmit={submitLeetcode}
          isSubmitting={isConnectingLeetcode}
          disableSubmit={!leetcodeUsername}
        >
          <p className="text-sm text-app-text-muted mb-6 leading-relaxed">
            Enter your LeetCode username to allow Jarvis to access your public statistics and submissions.
          </p>

          <div>
            <label htmlFor="username" className="block text-[13px] font-medium text-app-text-primary mb-2">
              LeetCode Username
            </label>
            <input
              id="username"
              type="text"
              value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)}
              className="w-full rounded-full border border-transparent bg-app-surface-elevated px-4 py-2 text-[13px] text-app-text-primary focus:border-app-border-default focus:outline-none"
              placeholder="e.g. username"
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
            <label htmlFor="chatId" className="block text-[13px] font-medium text-app-text-primary mb-2">
              Telegram Chat ID
            </label>
            <input
              id="chatId"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-full rounded-full border border-transparent bg-app-surface-elevated px-4 py-2 text-[13px] text-app-text-primary focus:border-app-border-default focus:outline-none"
              placeholder="e.g. 123456789"
              autoFocus
            />
          </div>

          <div className="mt-6 rounded-2xl bg-app-surface-elevated/45 border border-transparent p-5">
            <h3 className="text-[13px] font-semibold text-app-text-primary mb-2 tracking-tight">How to find your Chat ID:</h3>
            <ol className="list-decimal list-inside text-xs text-app-text-muted space-y-2 mb-3 leading-relaxed">
              <li>Open Telegram and search for <strong className="text-app-text-primary font-medium">@userinfobot</strong></li>
              <li>Start a chat (or send <code className="bg-app-surface px-2 py-0.5 rounded-full text-[11px] text-app-text-primary border border-app-border-default/20">/start</code>)</li>
              <li>Copy the number next to <strong className="text-app-text-primary font-medium">Id:</strong></li>
            </ol>
            <div className="pt-3 border-t border-app-border-default/25">
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
          <div className="mb-6 mt-4 rounded-2xl bg-app-surface-elevated/45 border border-transparent p-5">
            <h3 className="text-[13px] font-semibold text-app-text-primary mb-2 tracking-tight">How to find your API Key:</h3>
            <ol className="list-decimal list-inside text-xs text-app-text-muted space-y-2 mb-3 leading-relaxed">
              <li>Log in to your <strong className="text-app-text-primary font-medium">Dev.to</strong> account</li>
              <li>Go to <strong className="text-app-text-primary font-medium">Settings &gt; Extensions</strong></li>
              <li>Generate a new <strong className="text-app-text-primary font-medium">API Key</strong> and copy it</li>
            </ol>
            <div className="pt-3 border-t border-app-border-default/25">
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
            <label htmlFor="devtoApiKey" className="block text-[13px] font-medium text-app-text-primary mb-2">
              Dev.to API Key
            </label>
            <input
              id="devtoApiKey"
              type="text"
              value={devtoApiKey}
              onChange={(e) => setDevtoApiKey(e.target.value)}
              className="w-full rounded-full border border-transparent bg-app-surface-elevated px-4 py-2 text-[13px] text-app-text-primary focus:border-app-border-default focus:outline-none"
              placeholder="e.g. j7x2k..."
              autoFocus
            />
          </div>
        </ConnectionDialog>

      </main>
    </div>
  );
}
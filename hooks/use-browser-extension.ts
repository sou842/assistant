"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { nanoid } from "nanoid";

export interface BrowserCommand {
  action: "open_tab" | "search" | "click_element" | "execute_script" | "get_active_tab" | "open_companion";
  url?: string;
  selector?: string;
  query?: string;
  script?: string;
  description?: string;
}

export interface ExtensionLog {
  timestamp: string;
  action: string;
  status: "running" | "success" | "error";
  detail: string;
  error?: string | null;
}

export function useBrowserExtension() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<ExtensionLog[]>([]);
  const pendingRequestsRef = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

  // Send a command to the browser extension and wait for a response
  const sendBrowserCommand = useCallback((command: BrowserCommand): Promise<any> => {
    return new Promise((resolve, reject) => {
      // If we know we're not connected, fail early (except for ping and open_companion)
      if (!isConnected && command.action !== "ping" && command.action !== "open_companion") {
        reject(new Error("Browser extension is not connected. Make sure it is installed and the sidepanel is active."));
        return;
      }

      const messageId = nanoid();
      
      // Store callbacks
      pendingRequestsRef.current.set(messageId, { resolve, reject });

      // Post message to window (content script will intercept this)
      window.postMessage({
        source: "jarvis-webpage",
        messageId,
        message: command
      }, "*");

      // Setup a safety timeout in case extension doesn't respond
      setTimeout(() => {
        const pending = pendingRequestsRef.current.get(messageId);
        if (pending) {
          pendingRequestsRef.current.delete(messageId);
          pending.reject(new Error(`Extension request timed out: ${command.action}`));
        }
      }, 30000); // 30s timeout
    });
  }, [isConnected]);

  // Request the extension to open its panel
  const openCompanion = useCallback(() => {
    return sendBrowserCommand({
      action: "open_companion",
      description: "Requesting to open companion panel"
    });
  }, [sendBrowserCommand]);

  // Handle messages coming from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from our own window
      if (event.source !== window) return;

      const data = event.data;
      if (!data) return;

      // Handle direct command responses
      if (data.source === "jarvis-extension" && data.messageId) {
        const pending = pendingRequestsRef.current.get(data.messageId);
        if (pending) {
          pendingRequestsRef.current.delete(data.messageId);
          const response = data.response;
          if (response && response.success) {
            pending.resolve(response.result);
          } else {
            pending.reject(new Error(response?.error || "Unknown extension error"));
          }
        }
      }

      // Handle broadcast events (like log updates)
      if (data.source === "jarvis-extension-event") {
        if (data.event === "log_updated") {
          // Trigger a reload of logs or handle state directly
          // For now, we can append it or let components manage it
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Ping-pong heartbeat loop to detect extension presence
  useEffect(() => {
    let isMounted = true;
    let failCount = 0;

    const pingExtension = () => {
      const messageId = "heartbeat-" + nanoid();
      
      const handleHeartbeat = (event: MessageEvent) => {
        if (event.source !== window) return;
        const data = event.data;
        if (data && data.source === "jarvis-extension" && data.messageId === messageId) {
          if (isMounted) {
            setIsConnected(true);
            failCount = 0;
          }
          window.removeEventListener("message", handleHeartbeat);
        }
      };

      window.addEventListener("message", handleHeartbeat);

      // Post ping
      window.postMessage({
        source: "jarvis-webpage",
        messageId,
        message: { action: "ping" }
      }, "*");

      // Heartbeat timeout: if no response in 1200ms, mark as disconnected
      setTimeout(() => {
        window.removeEventListener("message", handleHeartbeat);
        failCount++;
        // If we fail twice in a row, consider it disconnected
        if (failCount >= 2 && isMounted) {
          setIsConnected(false);
        }
      }, 1200);
    };

    // Run immediately and then every 3 seconds
    pingExtension();
    const interval = setInterval(pingExtension, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    isConnected,
    sendBrowserCommand,
    openCompanion
  };
}

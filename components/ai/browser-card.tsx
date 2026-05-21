"use client";

import React from "react";
import { Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrowserCardProps {
  action: string;
  description: string;
  status: "idle" | "running" | "success" | "error";
  error?: string;
  result?: any;
}

export function BrowserCard({
  action,
  description,
  status,
  error,
  result
}: BrowserCardProps) {
  const getActionLabel = (act: string) => {
    switch (act) {
      case "open_tab":
        return "Open Tab";
      case "search":
        return "Web Search";
      case "click_element":
        return "Click Element";
      case "execute_script":
        return "Execute Script";
      case "get_active_tab":
        return "Get Active Tab";
      default:
        return act;
    }
  };

  return (
    <div className={cn(
      "w-full max-w-md rounded-2xl border bg-black/40 backdrop-blur-md p-4 transition-all duration-300 shadow-xl my-3",
      status === "running" && "border-cyan-500/20 shadow-cyan-500/5",
      status === "success" && "border-emerald-500/20 shadow-emerald-500/5",
      status === "error" && "border-red-500/20 shadow-red-500/5",
      status === "idle" && "border-white/5"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
          status === "running" && "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
          status === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          status === "error" && "bg-red-500/10 border-red-500/20 text-red-400",
          status === "idle" && "bg-white/5 border-white/10 text-white/40"
        )}>
          {status === "running" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 size={16} />
          ) : status === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Globe size={16} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
              Browser Control
            </span>
            <span className={cn(
              "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border",
              status === "running" && "bg-cyan-500/5 border-cyan-500/15 text-cyan-400/80",
              status === "success" && "bg-emerald-500/5 border-emerald-500/15 text-emerald-400/80",
              status === "error" && "bg-red-500/5 border-red-500/15 text-red-400/80",
              status === "idle" && "bg-white/5 border-white/10 text-white/40"
            )}>
              {getActionLabel(action)}
            </span>
          </div>
          <h4 className="text-sm font-medium text-white/80 mt-1 truncate">
            {description}
          </h4>
        </div>
      </div>

      {/* Details Area */}
      {status === "running" && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <span className="text-xs text-white/40 font-light">Sending command to browser companion...</span>
        </div>
      )}

      {status === "success" && (
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/50 flex flex-col gap-1">
          <span className="text-emerald-400/80 font-medium">✓ Command executed successfully</span>
          {result?.url && (
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-1 break-all"
            >
              <span>{result.url}</span>
              <ExternalLink size={10} />
            </a>
          )}
          {result?.title && (
            <span className="text-[10px] text-white/40 italic truncate">Tab title: "{result.title}"</span>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-red-400/90 font-light">
          <p className="font-semibold text-[11px] mb-1">Execution Failed</p>
          <p className="opacity-80 break-words">{error || "Connection to browser extension lost or action failed."}</p>
        </div>
      )}
    </div>
  );
}

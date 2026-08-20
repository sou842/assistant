"use client";

import React, { useState } from "react";
import { Earth, Menu, Puzzle, Download, Share2, HelpCircle, Copy } from "lucide-react";
import Link from "next/link";
import { useAI } from "@/app/ai/_components/ai-provider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onOpenMobileSidebar: () => void;
  isSyncing: boolean;
  extensionConnected?: boolean;
  openCompanion?: () => void;
}

export function ChatHeader({ onOpenMobileSidebar, isSyncing, extensionConnected = false, openCompanion }: ChatHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { activeChatId, chats, setChats } = useAI();
  const activeChat = chats.find(c => c.id === activeChatId);

  const handleTogglePublic = async (checked: boolean) => {
    try {
      const res = await fetch(`/api/chats/${activeChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: checked }),
      });

      if (res.ok) {
        toast.success(checked ? "Chat is now public" : "Chat is now private");
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, isPublic: checked } : c));
      } else {
        toast.error("Failed to update sharing settings");
      }
    } catch (err) {
      toast.error("An error occurred while sharing");
    }
  };

  return (
    <>
      <header className="h-16 md:pt-0 pt-3  flex items-center justify-between px-6 z-20 bg-app-canvas sticky top-0">
        {/* Left info badge */}
        <div className="flex items-center gap-3 select-none mr-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 cursor-pointer group">
              <span className="text-[15px] font-bold text-app-text-primary tracking-tight">Jarvis</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Share Button */}
          {activeChat && (
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-transparent hover:bg-app-surface-glass rounded-full text-app-text-secondary transition-all cursor-pointer shadow-sm"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          )}

          <button
            className="rounded-xl p-2 text-app-text-muted md:hidden"
            onClick={onOpenMobileSidebar}
            type="button"
          >
            <Menu size={16} />
          </button>

          <button
            onClick={() => {
              if (extensionConnected) {
                openCompanion?.();
              } else {
                setIsModalOpen(true);
              }
            }}
            className="items-center gap-2 px-2 py-1 bg-app-surface-glass rounded-full md:flex hidden hover:bg-app-surface-glass-strong active:scale-95 transition-all cursor-pointer"
            title={extensionConnected ? "Click to open Jarvis Companion Panel" : "Click to view install guide"}
            type="button"
          >
            <Earth size={10} className={`text-app-text-soft animate-pulse duration-1000 ${extensionConnected ? '' : 'text-red-400'}`} />
            <span className="text-[10px] font-medium capitalize text-app-text-soft">
              {extensionConnected ? 'Connected' : 'Extension Offline'}
            </span>
          </button>
        </div>
      </header>

      {/* Install Guide Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-app-surface border border-app-border-default text-app-text-primary max-w-md shadow-2xl">
            <h3 className="font-bold text-lg flex items-center gap-3">
              <span className="bg-blue-500/10 text-blue-500 p-2 rounded-xl border border-blue-500/20">
                <Puzzle size={20} />
              </span>
              Install Companion Extension
            </h3>
            <div className="pt-5 pb-1 space-y-4 text-sm text-app-text-secondary">
              <p>
                To enable advanced browser control, you need to install the Jarvis Companion extension manually.
              </p>

              <div className="bg-app-surface-glass border border-app-border-subtle rounded-xl p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="bg-app-surface text-app-text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-app-border-default mt-0.5">1</div>
                  <div>
                    <p className="font-semibold text-app-text-primary mb-1 text-[13px]">Download the Extension Files</p>
                    <p className="text-[11px] leading-relaxed mb-2 opacity-80">Get the extension package directly.</p>
                    <a href="/jarvis-extension.zip" download className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white border-none rounded-lg text-xs flex items-center gap-2 h-8 w-fit">
                      <Download size={14} /> Download .zip
                    </a>
                    <p className="text-[10px] mt-2 italic text-app-text-muted">Unzip it to a folder on your computer.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-app-surface text-app-text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-app-border-default mt-0.5">2</div>
                  <div>
                    <p className="font-semibold text-app-text-primary mb-1 text-[13px]">Open Browser Extensions</p>
                    <p className="text-[11px] leading-relaxed opacity-80">Go to <code>chrome://extensions</code> (or edge://extensions) in your URL bar and turn on <strong>Developer mode</strong> in the top right corner.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-app-surface text-app-text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-app-border-default mt-0.5">3</div>
                  <div>
                    <p className="font-semibold text-app-text-primary mb-1 text-[13px]">Load the Extension</p>
                    <p className="text-[11px] leading-relaxed opacity-80">Click <strong>"Load unpacked"</strong> and select the folder you unzipped in Step 1.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <button>close</button>
          </form>
        </dialog>
      )}

      {/* Share Dialog */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-md bg-app-surface-elevated border-app-border-default shadow-2xl rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-app-text-primary flex items-center gap-2">
              Share Chat
            </DialogTitle>
            <DialogDescription className="text-app-text-muted text-sm">
              Generate a public link to share this conversation with anyone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6 bg-app-surface-glass p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label
                  htmlFor="public-mode"
                  className="text-sm font-medium text-app-text-primary cursor-pointer"
                >
                  Public Access
                </label>
                <p className="text-xs text-app-text-muted">
                  {(activeChat as any)?.isPublic ? "Anyone with the link can view" : "Only you can access this chat"}
                </p>
              </div>
              <Switch
                id="public-mode"
                checked={(activeChat as any)?.isPublic || false}
                onCheckedChange={handleTogglePublic}
                className="data-[state=checked]:bg-app-primary cursor-pointer"
              />
            </div>

            {(activeChat as any)?.isPublic && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-xs font-semibold text-app-text-soft uppercase tracking-wider">Public Share Link</p>
                <div className="flex items-center gap-2 bg-app-surface-glass p-2 rounded-xl border border-app-border-default focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all duration-200">
                  <input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/ai/share/${activeChatId}` : ""}
                    className="flex-1 bg-transparent border-none text-sm text-app-text-primary px-2 outline-none select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/ai/share/${activeChatId}` : "";
                      navigator.clipboard.writeText(url);
                      toast.success("Link copied to clipboard");
                    }}
                    className="h-8 gap-1.5 px-3 rounded-full text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-glass-strong shrink-0 active:scale-95 transition-transform"
                  >
                    <Copy size={14} />
                    <span className="text-xs font-medium">Copy</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

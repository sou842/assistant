"use client";

import React, { useState } from "react";
import { Earth, Menu, Puzzle, Download } from "lucide-react";
import Link from "next/link";

interface ChatHeaderProps {
  onOpenMobileSidebar: () => void;
  isSyncing: boolean;
  extensionConnected?: boolean;
  openCompanion?: () => void;
}

export function ChatHeader({ onOpenMobileSidebar, isSyncing, extensionConnected = false, openCompanion }: ChatHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-app-border-default flex items-center justify-end px-6 z-20 backdrop-blur-2xl bg-app-canvas/70 sticky top-0">

        {/* <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-app-text-muted md:flex hidden">
            <span className="opacity-50">Session Active</span>
          </div>
          <div className="divider divider-horizontal mx-1 h-4 self-center opacity-10 md:flex hidden"></div>
          <Link className="btn btn-ghost btn-sm text-[10px] font-bold uppercase tracking-widest text-app-text-muted hover:text-app-text-primary transition-all" href="/">
            Disconnect
          </Link>
        </div> */}

        <div className="flex items-center gap-4">
          <button
            className="rounded-xl border border-app-border-subtle bg-app-surface-glass p-2 text-app-text-muted md:hidden"
            onClick={onOpenMobileSidebar}
            type="button"
          >
            <Menu size={16} />
          </button>

          {/* Extension Connection Badge */}
          <button
            onClick={() => {
              if (extensionConnected) {
                openCompanion?.();
              } else {
                setIsModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-3 py-1 bg-app-surface-glass rounded-full relative group hover:bg-app-surface-glass-strong active:scale-95 transition-all border border-app-border-subtle cursor-pointer"
            title={extensionConnected ? "Click to open Jarvis Companion Panel" : "Click to view install guide"}
            type="button"
          >
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${extensionConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
            <span className="text-[10px] font-medium capitalize text-app-text-soft">
              {extensionConnected ? 'Companion Active' : 'Companion Offline'}
            </span>
            <div className="absolute right-0 top-8 w-60 p-3 bg-app-surface border border-app-border-default rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-[10px] text-app-text-soft space-y-1 text-left leading-relaxed pointer-events-none">
              <p className="font-semibold text-app-text-secondary">Browser Control Companion</p>
              {extensionConnected ? (
                <p className="text-emerald-400/80">Successfully connected to extension sidepanel. Click to re-open if closed.</p>
              ) : (
                <p>Extension offline. Click to view instructions on how to install the browser extension.</p>
              )}
            </div>
          </button>

          <div className="items-center gap-2 px-3 py-1 bg-app-surface-glass rounded-full md:flex hidden">
            <Earth size={10} className={'text-app-text-soft animate-pulse duration-1000'} />
            <span className="text-[10px] font-medium capitalize text-app-text-soft">
              {isSyncing ? 'Syncing with Database...' : 'connected'}
            </span>
          </div>
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
    </>
  );
}

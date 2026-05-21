"use client";

import React from "react";
import { Earth, Menu } from "lucide-react";
import Link from "next/link";

interface ChatHeaderProps {
  onOpenMobileSidebar: () => void;
  isSyncing: boolean;
  extensionConnected?: boolean;
  openCompanion?: () => void;
}

export function ChatHeader({ onOpenMobileSidebar, isSyncing, extensionConnected = false, openCompanion }: ChatHeaderProps) {
  return (
    <header className="h-16 border-b border-[#111] flex items-center justify-end px-6 z-20 backdrop-blur-2xl bg-[#000000]/70 sticky top-0">

      {/* <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-white/40 md:flex hidden">
          <span className="opacity-50">Session Active</span>
        </div>
        <div className="divider divider-horizontal mx-1 h-4 self-center opacity-10 md:flex hidden"></div>
        <Link className="btn btn-ghost btn-sm text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all" href="/">
          Disconnect
        </Link>
      </div> */}

      <div className="flex items-center gap-4">
        <button
          className="rounded-xl border border-white/5 bg-white/5 p-2 text-white/40 md:hidden"
          onClick={onOpenMobileSidebar}
          type="button"
        >
          <Menu size={16} />
        </button>

        {/* Extension Connection Badge */}
        <button 
          onClick={openCompanion}
          className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full relative group hover:bg-white/10 active:scale-95 transition-all border border-white/5 cursor-pointer"
          title="Click to open Jarvis Companion Panel"
          type="button"
        >
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${extensionConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
          <span className="text-[10px] font-medium capitalize text-white/60">
            {extensionConnected ? 'Companion Active' : 'Companion Offline'}
          </span>
          <div className="absolute right-0 top-8 w-60 p-3 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-[10px] text-white/50 space-y-1 text-left leading-relaxed pointer-events-none">
            <p className="font-semibold text-white/80">Browser Control Companion</p>
            {extensionConnected ? (
              <p className="text-emerald-400/80">Successfully connected to extension sidepanel. Click to re-open if closed.</p>
            ) : (
              <p>Extension offline. Click to launch or open the sidepanel manually.</p>
            )}
          </div>
        </button>

        <div className="items-center gap-2 px-3 py-1 bg-white/5 rounded-full md:flex hidden">
          <Earth size={10} className={'text-white/60 animate-pulse duration-1000'} />
          <span className="text-[10px] font-medium capitalize text-white/60">
            {isSyncing ? 'Syncing with Database...' : 'connected'}
          </span>
        </div>
      </div>
    </header>
  );
}

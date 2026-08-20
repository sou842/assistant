"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Brain, Settings as SettingsIcon, User, History, X, Search, Shield, CreditCard, Zap, Edit3, Clock, Terminal, Wrench, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralTab } from "./settings/general-tab";
import { MemoryTab } from "./settings/memory-tab";
import { ContactTab } from "./settings/contact-tab";
import { HistoryTab } from "./settings/history-tab";

type SettingTab = "general" | "memory" | "contact" | "history";

const settingsGroup = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "contact", label: "Contacts", icon: User },
  { id: "history", label: "History", icon: History },
];

const customizeGroup = [
  { id: "memory", label: "Memory", icon: Brain },
];

export function SettingsModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const settingsParam = searchParams.get("settings");
  const open = settingsParam !== null;
  const currentTab = (settingsParam as SettingTab) || "general";

  const handleOpenChange = (isOpen: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (isOpen) {
      params.set("settings", "general");
    } else {
      params.delete("settings");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tab: SettingTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("settings", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  function maincontent() {
    switch (currentTab) {
      case "general":
        return <GeneralTab />;
      case "memory":
        return <MemoryTab />;
      case "contact":
        return <ContactTab />;
      case "history":
        return <HistoryTab />;
      default:
        return null;
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 bg-app-surface md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden h-[100dvh] md:h-[80vh] border border-app-border-default/20 animate-in zoom-in-95 duration-200 outline-none">
          
          <Dialog.Title className="sr-only">Settings</Dialog.Title>

          {/* Left Sidebar Navigation */}
          <div className="w-full md:w-[260px] flex-shrink-0 bg-app-surface flex flex-col z-10 shrink-0 md:border-r border-app-border-default/20">
            {/* Search Bar */}
            <div className="p-4 pt-6">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-full bg-app-surface-elevated text-app-text-primary text-[13px] rounded-lg pl-9 pr-3 py-1.5 outline-none border border-transparent focus:border-app-border-default transition-colors" 
                />
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-6 overflow-x-auto md:overflow-y-auto px-4 md:px-3 pb-6 scrollbar-hide">
              
              {/* Settings Group */}
              <div>
                <h3 className="px-3 mb-2 text-xs font-medium text-app-text-muted hidden md:block tracking-wide">Settings</h3>
                <div className="flex flex-row md:flex-col gap-0.5">
                  {settingsGroup.map((tab) => {
                    const isActive = currentTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as SettingTab)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all cursor-pointer whitespace-nowrap outline-none",
                          isActive
                            ? "bg-[#2a2a2a] text-app-text-primary font-medium"
                            : "text-[#a0a0a0] hover:bg-app-surface-elevated hover:text-app-text-primary"
                        )}
                      >
                        <Icon className={cn("size-[16px]", isActive ? "text-app-text-primary" : "text-[#a0a0a0]")} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customize Group */}
              <div>
                <h3 className="px-3 mb-2 text-xs font-medium text-app-text-muted hidden md:block tracking-wide">Customize</h3>
                <div className="flex flex-row md:flex-col gap-0.5">
                  {customizeGroup.map((tab) => {
                    const isActive = currentTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as SettingTab)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all cursor-pointer whitespace-nowrap outline-none",
                          isActive
                            ? "bg-[#2a2a2a] text-app-text-primary font-medium"
                            : "text-[#a0a0a0] hover:bg-app-surface-elevated hover:text-app-text-primary"
                        )}
                      >
                        <Icon className={cn("size-[16px]", isActive ? "text-app-text-primary" : "text-[#a0a0a0]")} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-app-surface relative">
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 p-1.5 text-app-text-muted hover:text-app-text-primary rounded-md transition-colors cursor-pointer hidden md:block">
                <X size={18} />
              </button>
            </Dialog.Close>

            <div className="max-w-4xl px-4 py-6 md:px-12 md:py-12">
              {maincontent()}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

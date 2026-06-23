"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Settings as SettingsIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "../_components/page-header";
import { GeneralTab } from "./_components/general-tab";
import { MemoryTab } from "./_components/memory-tab";
import { ContactTab } from "./_components/contact-tab";

type SettingTab = "general" | "memory" | "contact" | "personalization" | "apps" | "data" | "security";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tabs management
  const currentTab = (searchParams.get("tab") as SettingTab) || "general";
  const setActiveTab = (tab: SettingTab) => {
    router.push(`/ai/setting?tab=${tab}`);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const sidebarTabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "contact", label: "Contacts", icon: User },
    // { id: "personalization", label: "Personalization", icon: Palette },
    // { id: "apps", label: "Apps", icon: LayoutGrid },
    // { id: "data", label: "Data controls", icon: Database },
    // { id: "security", label: "Security and login", icon: Shield },
  ];

  return (
    <div className="flex h-screen flex-col bg-app-background overflow-hidden text-app-text-primary">
      <PageHeader
        icon={<SettingsIcon />}
        title="Settings"
        subtitle="Manage your AI preferences and memory"
        backHref="/ai"
      />

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-app-background relative">
          <div className="max-w-6xl mx-auto px-4 py-6 md:px-10 md:py-10">

            {/* GENERAL TAB */}
            {currentTab === "general" && <GeneralTab />}

            {/* MEMORY TAB */}
            {currentTab === "memory" && <MemoryTab />}

            {/* CONTACT TAB */}
            {currentTab === "contact" && <ContactTab />}

            {/* DUMMY TABS */}
            {["personalization", "apps", "data", "security"].includes(currentTab) && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h2 className="text-xl font-semibold mb-6 pb-4 border-b border-app-border-default capitalize">
                  {currentTab.replace("-", " ")}
                </h2>
                <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed border-app-border-default rounded-xl">
                  <p className="text-app-text-muted text-sm">This setting category is currently empty.</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* right Sidebar */}
        <div className="w-full md:w-[240px] lg:w-[260px] flex-shrink-0 border-b md:border-b-0 md:border-l border-app-border-default bg-app-surface/40 flex flex-col">
          <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto px-2 py-2 gap-1 scrollbar-hide">
            {sidebarTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingTab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-app-surface-elevated text-app-text-primary font-medium shadow-sm border border-app-border-default/50"
                      : "text-app-text-secondary hover:bg-app-surface hover:text-app-text-primary"
                  )}
                >
                  <Icon className={cn("size-4", isActive ? "text-brand-primary" : "text-app-text-ghost")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
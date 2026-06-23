"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

export function GeneralTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-xl font-semibold mb-6 pb-2">General</h2>

      <div className="space-y-1">
        {/* Setting Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-app-border-default/50 gap-4">
          <div>
            <h3 className="text-sm font-medium text-app-text-primary">Appearance</h3>
            <p className="text-[13px] text-app-text-muted mt-0.5">Select your preferred client layout scheme.</p>
          </div>
          <div className="flex items-center gap-2 bg-app-surface-elevated p-1 rounded-full border border-app-border-default">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                theme === "light" ? "bg-app-background shadow-sm text-app-text-primary border border-app-border-default/50" : "text-app-text-muted hover:text-app-text-primary"
              )}
            >
              <Sun className="size-3.5" />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                theme === "dark" ? "bg-app-background shadow-sm text-app-text-primary border border-app-border-default/50" : "text-app-text-muted hover:text-app-text-primary"
              )}
            >
              <Moon className="size-3.5" />
              Dark
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                theme === "system" ? "bg-app-background shadow-sm text-app-text-primary border border-app-border-default/50" : "text-app-text-muted hover:text-app-text-primary"
              )}
            >
              <Laptop className="size-3.5" />
              System
            </button>
          </div>
        </div>

        {/* Dummy Settings Rows to match ChatGPT style */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-app-border-default/50 gap-4 opacity-70">
          <div>
            <h3 className="text-sm font-medium text-app-text-primary">Language</h3>
            <p className="text-[13px] text-app-text-muted mt-0.5">Interface language</p>
          </div>
          <select className="bg-app-surface-elevated border border-app-border-default rounded-lg px-3 py-2 text-sm text-app-text-primary outline-none min-w-[140px] cursor-not-allowed" disabled>
            <option>Auto-detect</option>
            <option>English</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-app-border-default/50 gap-4 opacity-70">
          <div>
            <h3 className="text-sm font-medium text-app-text-primary">Higher intelligence</h3>
            <p className="text-[13px] text-app-text-muted mt-0.5 max-w-[80%]">Jarvis can automatically use a higher intelligence setting when you ask a complex question.</p>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed">
            <input type="checkbox" className="sr-only peer" disabled defaultChecked />
            <div className="w-11 h-6 bg-app-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-app-border-default peer-checked:bg-brand-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

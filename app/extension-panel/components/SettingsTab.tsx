import { useState, useEffect } from "react";
import { Shield, ToggleLeft, ToggleRight, Info, Sliders, EyeOff, Bell, Volume2, Terminal, FolderOpen, User } from "lucide-react";

interface SettingsTabProps {
  activeTab: string;
  session: any;
  settings: {
    sandboxEnabled: boolean;
    maxActions: number;
    desktopAlerts: boolean;
    soundAlerts: boolean;
    verboseLogs: boolean;
    stealthMode: boolean;
    autoSaveEnabled: boolean;
    autoSavePath: string;
  };
  onUpdateSettings: (updatedSettings: any) => void;
}

export function SettingsTab({
  activeTab,
  session,
  settings,
  onUpdateSettings,
}: SettingsTabProps) {
  const [imageError, setImageError] = useState(false);

  // Destructure settings with safe fallbacks
  const {
    sandboxEnabled = true,
    maxActions = 75,
    desktopAlerts = true,
    soundAlerts = false,
    verboseLogs = false,
    stealthMode = false,
    autoSaveEnabled = false,
    autoSavePath = "/JarvisLogs",
  } = settings || {};

  const handleToggle = (key: string, currentValue: boolean) => {
    onUpdateSettings({
      ...settings,
      [key]: !currentValue,
    });
  };

  const handleValueChange = (key: string, value: any) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  if (activeTab !== "settings") return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0a0a0a] text-zinc-300">
      {/* Title & User Profile */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Settings</h2>
          <p className="text-[11px] text-zinc-500 mt-1">Configure your Jarvis agent and extension panel options.</p>
        </div>

        {session?.user && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-brand-primary/10 flex items-center justify-center shrink-0 border border-brand-primary/20 text-brand-primary text-xs font-bold font-mono">
              {session.user.image && !imageError ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>
                  {session.user.name
                    ? session.user.name.split(" ")?.map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                    : "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-200 truncate">{session.user.name || "Unknown User"}</div>
              <div className="text-[11px] text-zinc-500 truncate">{session.user.email || "No email available"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications & Logs */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-400 block">Notifications & Diagnostics</label>

        <div className="space-y-2">
          {/* Verbose Execution Logs */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex gap-2.5 items-start">
              <Terminal size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Verbose Execution Logs</span>
                <span className="text-[10px] text-zinc-500 leading-normal">
                  Output comprehensive background CLI and driver command sequences in the console.
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle("verboseLogs", verboseLogs)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {verboseLogs ? (
                <ToggleRight size={24} className="text-brand-primary" />
              ) : (
                <ToggleLeft size={24} className="text-zinc-600" />
              )}
            </button>
          </div>

          {/* Desktop Alerts */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex gap-2.5 items-start">
              <Bell size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Desktop Notifications</span>
                <span className="text-[10px] text-zinc-500 leading-normal">
                  Notify on desktop when automation workflows finish execution or require input.
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle("desktopAlerts", desktopAlerts)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {desktopAlerts ? (
                <ToggleRight size={24} className="text-brand-primary" />
              ) : (
                <ToggleLeft size={24} className="text-zinc-600" />
              )}
            </button>
          </div>

          {/* Sound Alerts */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex gap-2.5 items-start">
              <Volume2 size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Audible Alerts</span>
                <span className="text-[10px] text-zinc-500 leading-normal">
                  Play warning sounds on CAPTCHAs, prompt inputs, or execution failure.
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle("soundAlerts", soundAlerts)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {soundAlerts ? (
                <ToggleRight size={24} className="text-brand-primary" />
              ) : (
                <ToggleLeft size={24} className="text-zinc-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Agent Execution Settings */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-400 block">Agent Execution & Security</label>

        <div className="space-y-2">
          {/* Sandbox Toggle */}
          {/* <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex gap-2.5 items-start">
              <Shield size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Isolated Sandbox Mode</span>
                <span className="text-[10px] text-zinc-500 leading-normal">
                  Execute user scripts inside a secure Web Worker sandbox environment.
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle("sandboxEnabled", sandboxEnabled)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {sandboxEnabled ? (
                <ToggleRight size={24} className="text-brand-primary" />
              ) : (
                <ToggleLeft size={24} className="text-zinc-600" />
              )}
            </button>
          </div> */}

          {/* Anti-Bot & Stealth Mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex gap-2.5 items-start">
              <EyeOff size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Anti-Bot & Stealth Mode</span>
                <span className="text-[10px] text-zinc-500 leading-normal">
                  Emulate human browser interaction speeds and random cursor paths to avoid detections.
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle("stealthMode", stealthMode)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {stealthMode ? (
                <ToggleRight size={24} className="text-brand-primary" />
              ) : (
                <ToggleLeft size={24} className="text-zinc-600" />
              )}
            </button>
          </div>

          {/* Maximum Actions Limit */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-200">Maximum Actions Limit: {maxActions}</span>
              </div>
              <span className="text-[10px] text-zinc-500">Safeguard cap</span>
            </div>
            <input
              type="range"
              min="40"
              max="150"
              step="5"
              value={maxActions}
              onChange={(e) => handleValueChange("maxActions", parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>
        </div>
      </div>

      {/* Local Integration */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-400 block">Local Integration</label>

        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-3">
          {/* File System Auto-Save Switch */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5 items-start">
              <FolderOpen size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">File System Auto-Save</span>
                <span className="text-[10px] text-zinc-500 leading-normal">
                  Auto-download execution logs, captured images, and scraped datasets.
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle("autoSaveEnabled", autoSaveEnabled)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {autoSaveEnabled ? (
                <ToggleRight size={24} className="text-brand-primary" />
              ) : (
                <ToggleLeft size={24} className="text-zinc-600" />
              )}
            </button>
          </div>

          {/* Auto-Save Path Input */}
          {autoSaveEnabled && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-400 block">Default Export Path</span>
              <input
                type="text"
                value={autoSavePath}
                onChange={(e) => handleValueChange("autoSavePath", e.target.value)}
                placeholder="e.g. /JarvisLogs"
                className="w-full bg-[#121212] text-xs text-zinc-300 p-2 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none placeholder-zinc-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* About Info */}
      <div className="flex gap-2 px-1 text-zinc-500 text-[10px] items-start">
        <Info size={12} className="mt-0.5 flex-shrink-0" />
        <span>
          Jarvis Extension Panel v1.2.0. Changes made here apply immediately to the current browsing session.
        </span>
      </div>
    </div>
  );
}

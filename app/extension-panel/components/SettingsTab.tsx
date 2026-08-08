import { useState } from "react";
import { ToggleLeft, ToggleRight, Sliders, EyeOff, Bell, Volume2, Terminal, FolderOpen, Keyboard, RotateCcw, Trash2, Plus, Check, Pencil } from "lucide-react";

export interface CustomModelConfig {
  id: string;
  label: string;
  modelName: string;
  apiToken: string;
  allowFallback?: boolean;
}

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
    customModels?: CustomModelConfig[];
    activeCustomModelId?: string;
  };
  onUpdateSettings: (updatedSettings: any) => void;
}

export function SettingsTab({
  activeTab,
  session,
  settings,
  onUpdateSettings,
}: SettingsTabProps) {
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
    customModels = [],
    activeCustomModelId = "",
  } = settings || {};

  const [imageError, setImageError] = useState(false);
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);

  const [newModelLabel, setNewModelLabel] = useState("");
  const [newModelName, setNewModelName] = useState("gemini-2.5-flash");
  const [newModelToken, setNewModelToken] = useState("");
  const [newModelAllowFallback, setNewModelAllowFallback] = useState(true);
  const [isAddingModel, setIsAddingModel] = useState(false);

  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editModelLabel, setEditModelLabel] = useState("");
  const [editModelName, setEditModelName] = useState("gemini-2.5-flash");
  const [editModelToken, setEditModelToken] = useState("");
  const [editModelAllowFallback, setEditModelAllowFallback] = useState(true);

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
            <button
              onClick={() => setShowReloadConfirm(true)}
              title="Reload Extension Connection"
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition duration-200 cursor-pointer shrink-0"
            >
              <RotateCcw size={14} />
            </button>
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

      {/* Custom AI Models Manager */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-400 block font-sans">Custom AI Models</label>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          {customModels.length > 0 ? (
            <div className="flex flex-col gap-1.5 mb-3 max-h-75 overflow-y-auto pr-1">
              {/* System Defaults Selector */}
              <button
                type="button"
                onClick={() => handleValueChange("activeCustomModelId", "")}
                className={`w-full px-3 py-1.5 text-left text-xs font-medium rounded-xl border flex items-center justify-between transition cursor-pointer font-sans ${
                  activeCustomModelId === ""
                    ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:text-zinc-300 hover:bg-white/10"
                }`}
              >
                <span>System Defaults (Gemini / OpenAI / Mistral)</span>
                {activeCustomModelId === "" && <Check size={11} />}
              </button>

              {customModels.map((m: any) => {
                const isEditing = editingModelId === m.id;
                const isActive = activeCustomModelId === m.id;

                if (isEditing) {
                  return (
                    <div key={m.id} className="space-y-2.5 p-3 bg-black/40 rounded-xl border border-brand-primary/40 animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-400 block font-sans">Model Label</span>
                        <input
                          type="text"
                          value={editModelLabel}
                          onChange={(e) => setEditModelLabel(e.target.value)}
                          className="w-full bg-[#121212] text-xs text-zinc-300 p-1.5 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-400 block font-sans">AI Model Name</span>
                        <select
                          value={editModelName}
                          onChange={(e) => setEditModelName(e.target.value)}
                          className="w-full bg-[#121212] text-xs text-zinc-300 p-1.5 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none font-sans cursor-pointer"
                        >
                          <optgroup label="Google Gemini">
                            <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                            <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                          </optgroup>
                          <optgroup label="OpenAI">
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="o3-mini">o3-mini</option>
                            <option value="o1-mini">o1-mini</option>
                          </optgroup>
                          <optgroup label="Anthropic Claude">
                            <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                            <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
                          </optgroup>
                          <optgroup label="DeepSeek">
                            <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                            <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                          </optgroup>
                          <optgroup label="Zhipu GLM">
                            <option value="glm-5.2">GLM-5.2 (Flagship)</option>
                            <option value="glm-5.1">GLM-5.1 (High Performance)</option>
                            <option value="glm-4-plus">GLM-4-Plus</option>
                          </optgroup>
                          <optgroup label="MiniMax">
                            <option value="MiniMax-M3">MiniMax-M3 (Flagship)</option>
                            <option value="MiniMax-M2.7">MiniMax-M2.7</option>
                            <option value="MiniMax-M2.5">MiniMax-M2.5</option>
                          </optgroup>
                          <optgroup label="Mistral">
                            <option value="mistral-large-latest">Mistral Large</option>
                            <option value="mistral-small-latest">Mistral Small</option>
                          </optgroup>
                          <optgroup label="Meta Llama">
                            <option value="llama-3.3-70b-instruct">Llama 3.3 70B</option>
                            <option value="llama-3.1-405b-instruct">Llama 3.1 405B</option>
                          </optgroup>
                          <optgroup label="Gemma">
                            <option value="gemma-2-27b-it">Gemma 2 27B</option>
                            <option value="gemma-2-9b-it">Gemma 2 9B</option>
                          </optgroup>
                          <optgroup label="OpenRouter">
                            <option value="openrouter/google/gemini-2.5-pro">OpenRouter: Gemini 2.5 Pro</option>
                            <option value="openrouter/meta-llama/llama-3.3-70b-instruct">OpenRouter: Llama 3.3 70B</option>
                            <option value="openrouter/anthropic/claude-3.5-sonnet">OpenRouter: Claude 3.5 Sonnet</option>
                            <option value="openrouter/deepseek/deepseek-chat">OpenRouter: DeepSeek V3</option>
                          </optgroup>
                          <option value="custom">Custom Model Name...</option>
                        </select>
                      </div>
                      {editModelName === "custom" && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                          <span className="text-[9px] text-zinc-400 block font-sans">Specify Custom Model Identifier</span>
                          <input
                            type="text"
                            defaultValue={m.modelName}
                            placeholder="e.g. claude-3-5-sonnet"
                            className="w-full bg-[#121212] text-xs text-zinc-300 p-1.5 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none placeholder-zinc-700 font-sans"
                            id="edit-custom-model-input"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-400 block font-sans">API Key / Token</span>
                        <input
                          type="password"
                          value={editModelToken}
                          onChange={(e) => setEditModelToken(e.target.value)}
                          className="w-full bg-[#121212] text-xs text-zinc-300 p-1.5 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none font-sans"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          id="edit-model-fallback"
                          checked={editModelAllowFallback}
                          onChange={(e) => setEditModelAllowFallback(e.target.checked)}
                          className="rounded border-white/10 bg-[#121212] text-brand-primary focus:ring-brand-primary/50 cursor-pointer"
                        />
                        <label htmlFor="edit-model-fallback" className="text-[9px] text-zinc-400 font-sans cursor-pointer select-none">
                          Enable System Fallback (use defaults on failure)
                        </label>
                      </div>
                      <div className="flex gap-2 justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingModelId(null)}
                          className="px-2 py-1 rounded-full text-[9px] font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer font-sans"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editModelLabel.trim() || !editModelToken.trim()) return;
                            let finalModelName = editModelName;
                            if (editModelName === "custom") {
                              const inputVal = (document.getElementById("edit-custom-model-input") as HTMLInputElement)?.value;
                              if (inputVal && inputVal.trim()) {
                                finalModelName = inputVal.trim();
                              }
                            }
                            const updated = customModels.map((item: any) => {
                              if (item.id === m.id) {
                                return {
                                  ...item,
                                  label: editModelLabel.trim(),
                                  modelName: finalModelName,
                                  apiToken: editModelToken.trim(),
                                  allowFallback: editModelAllowFallback
                                };
                              }
                              return item;
                            });
                            onUpdateSettings({
                              ...settings,
                              customModels: updated
                            });
                            setEditingModelId(null);
                          }}
                          className="px-2 py-1 rounded-full text-[9px] font-medium text-white bg-brand-primary hover:bg-brand-primary/75 transition cursor-pointer font-sans"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={m.id} 
                    className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all duration-150 ${
                      isActive 
                        ? "bg-[#161616] border-brand-primary/30" 
                        : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]"
                    }`}
                  >
                    {/* Left: Radio & Info */}
                    <div 
                      onClick={() => handleValueChange("activeCustomModelId", m.id)}
                      className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                    >
                      <div className="shrink-0">
                        {isActive ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                            <Check size={9} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 hover:border-zinc-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-medium font-sans truncate ${isActive ? 'text-brand-primary font-semibold' : 'text-zinc-200'}`}>
                          {m.label}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono truncate">
                          {m.modelName} • {m.apiToken.slice(0, 3)}..{m.apiToken.slice(-3)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {/* Compact Fallback Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = customModels.map((item: any) => {
                            if (item.id === m.id) {
                              return { ...item, allowFallback: item.allowFallback === false };
                            }
                            return item;
                          });
                          onUpdateSettings({
                            ...settings,
                            customModels: updated
                          });
                        }}
                        className={`px-1.5 py-0.5 text-[8px] font-semibold rounded-full transition duration-200 cursor-pointer font-sans border ${
                          m.allowFallback !== false
                            ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                        }`}
                        title={m.allowFallback !== false ? "Disable system fallback" : "Enable system fallback"}
                      >
                        {m.allowFallback !== false ? "Fallback On" : "No Fallback"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingModelId(m.id);
                          setEditModelLabel(m.label);
                          setEditModelName(m.modelName);
                          setEditModelToken(m.apiToken);
                          setEditModelAllowFallback(m.allowFallback !== false);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-full transition cursor-pointer shrink-0"
                        title="Edit Config"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = customModels.filter((item: any) => item.id !== m.id);
                          let nextActiveId = activeCustomModelId;
                          if (activeCustomModelId === m.id) {
                            nextActiveId = "";
                          }
                          onUpdateSettings({
                            ...settings,
                            customModels: updated,
                            activeCustomModelId: nextActiveId
                          });
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition cursor-pointer shrink-0"
                        title="Delete Config"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 italic font-sans mb-3">No custom models configured. Using System Defaults.</p>
          )}

          {isAddingModel ? (
            <div className="space-y-3 p-3 bg-black/30 rounded-xl border border-white/5 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-400 block font-sans">Model Label (e.g. Work OpenAI)</span>
                <input
                  type="text"
                  value={newModelLabel}
                  onChange={(e) => setNewModelLabel(e.target.value)}
                  placeholder="Enter config name"
                  className="w-full bg-[#121212] text-xs text-zinc-300 p-2 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none placeholder-zinc-700 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-400 block font-sans">AI Model Name</span>
                <select
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full bg-[#121212] text-xs text-zinc-300 p-2 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none font-sans cursor-pointer"
                >
                  <optgroup label="Google Gemini">
                    <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="o3-mini">o3-mini</option>
                    <option value="o1-mini">o1-mini</option>
                  </optgroup>
                  <optgroup label="Anthropic Claude">
                    <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
                  </optgroup>
                  <optgroup label="DeepSeek">
                    <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                    <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                  </optgroup>
                  <optgroup label="Zhipu GLM">
                    <option value="glm-5.2">GLM-5.2 (Flagship)</option>
                    <option value="glm-5.1">GLM-5.1 (High Performance)</option>
                    <option value="glm-4-plus">GLM-4-Plus</option>
                  </optgroup>
                  <optgroup label="MiniMax">
                    <option value="MiniMax-M3">MiniMax-M3 (Flagship)</option>
                    <option value="MiniMax-M2.7">MiniMax-M2.7</option>
                    <option value="MiniMax-M2.5">MiniMax-M2.5</option>
                  </optgroup>
                  <optgroup label="Mistral">
                    <option value="mistral-large-latest">Mistral Large</option>
                    <option value="mistral-small-latest">Mistral Small</option>
                  </optgroup>
                  <optgroup label="Meta Llama">
                    <option value="llama-3.3-70b-instruct">Llama 3.3 70B</option>
                    <option value="llama-3.1-405b-instruct">Llama 3.1 405B</option>
                  </optgroup>
                  <optgroup label="Gemma">
                    <option value="gemma-2-27b-it">Gemma 2 27B</option>
                    <option value="gemma-2-9b-it">Gemma 2 9B</option>
                  </optgroup>
                  <optgroup label="OpenRouter">
                    <option value="openrouter/google/gemini-2.5-pro">OpenRouter: Gemini 2.5 Pro</option>
                    <option value="openrouter/meta-llama/llama-3.3-70b-instruct">OpenRouter: Llama 3.3 70B</option>
                    <option value="openrouter/anthropic/claude-3.5-sonnet">OpenRouter: Claude 3.5 Sonnet</option>
                    <option value="openrouter/deepseek/deepseek-chat">OpenRouter: DeepSeek V3</option>
                  </optgroup>
                  <option value="custom">Custom Model Name...</option>
                </select>
              </div>
              {newModelName === "custom" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <span className="text-[10px] text-zinc-400 block font-sans">Specify Custom Model Identifier</span>
                  <input
                    type="text"
                    placeholder="e.g. claude-3-5-sonnet"
                    className="w-full bg-[#121212] text-xs text-zinc-300 p-2 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none placeholder-zinc-700 font-sans"
                    id="custom-model-input"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-400 block font-sans">API Key / Token</span>
                <input
                  type="password"
                  value={newModelToken}
                  onChange={(e) => setNewModelToken(e.target.value)}
                  placeholder="Enter API key"
                  className="w-full bg-[#121212] text-xs text-zinc-300 p-2 rounded-lg border border-white/5 focus:border-brand-primary/50 focus:outline-none placeholder-zinc-700 font-sans"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="new-model-fallback"
                  checked={newModelAllowFallback}
                  onChange={(e) => setNewModelAllowFallback(e.target.checked)}
                  className="rounded border-white/10 bg-[#121212] text-brand-primary focus:ring-brand-primary/50 cursor-pointer"
                />
                <label htmlFor="new-model-fallback" className="text-[10px] text-zinc-400 font-sans cursor-pointer select-none">
                  Enable System Fallback (use defaults on failure)
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingModel(false)}
                  className="px-2.5 py-1.5 rounded-full text-[10px] font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newModelLabel.trim() || !newModelToken.trim()) return;
                    let finalModelName = newModelName;
                    if (newModelName === "custom") {
                      const inputVal = (document.getElementById("custom-model-input") as HTMLInputElement)?.value;
                      if (inputVal && inputVal.trim()) {
                        finalModelName = inputVal.trim();
                      }
                    }
                    const newItem = {
                      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                      label: newModelLabel.trim(),
                      modelName: finalModelName,
                      apiToken: newModelToken.trim(),
                      allowFallback: newModelAllowFallback
                    };
                    const updated = [...customModels, newItem];
                    onUpdateSettings({
                      ...settings,
                      customModels: updated,
                      activeCustomModelId: newItem.id
                    });
                    setNewModelLabel("");
                    setNewModelToken("");
                    setNewModelAllowFallback(true);
                    setIsAddingModel(false);
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[10px] font-medium text-white bg-brand-primary hover:bg-brand-primary/75 transition cursor-pointer font-sans"
                >
                  Save Config
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingModel(true)}
              className="w-full py-1.5 border border-dashed border-white/10 hover:border-brand-primary/40 rounded-xl text-[10px] font-medium text-zinc-400 hover:text-brand-primary flex items-center justify-center gap-1 transition-colors cursor-pointer font-sans"
            >
              <Plus size={10} />
              Add Custom Model Config
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-zinc-400 block">Keyboard Shortcuts</label>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
          <div className="flex flex-col items-start justify-between">
            <div className="flex gap-2.5 items-start">
              <Keyboard size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Toggle Jarvis Sidepanel</span>
                <span className="text-[10px] text-zinc-500">
                  Press shortcut keys <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-zinc-300 bg-white/5 rounded shadow-sm">⌘ + J</kbd> / <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-zinc-300 bg-white/5 rounded shadow-sm">Ctrl + J</kbd> to quickly open or close the extension panel.
                </span>
              </div>
            </div>
            {/* <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-300 bg-white/5 rounded border border-white/10 shadow-sm">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-300 bg-white/5 rounded border border-white/10 shadow-sm">
                J
              </kbd>
              <span className="text-[10px] text-zinc-600 px-0.5">/</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-300 bg-white/5 rounded border border-white/10 shadow-sm">
                Ctrl
              </kbd>
              <span className="text-zinc-600 text-[10px]">+</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-300 bg-white/5 rounded border border-white/10 shadow-sm">
                J
              </kbd>
            </div> */}
          </div>
        </div>
      </div>

      {showReloadConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-default"
          onClick={() => setShowReloadConfirm(false)}
        >
          <div 
            className="bg-[#121212] border border-white/10 rounded-2xl p-5 max-w-xs w-full mx-4 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-400">
              <h3 className="font-semibold text-sm text-white font-sans">Reload Connection</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Are you sure you want to reload the extension connection? This will restart the background service worker.
            </p>
            
            <div className="flex gap-2.5 justify-end pt-2">
              <button
                onClick={() => setShowReloadConfirm(false)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.parent) {
                    window.parent.postMessage({ type: "FROM_NEXTJS", action: "RELOAD_EXTENSION" }, "*");
                  }
                  setShowReloadConfirm(false);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary/75 transition cursor-pointer font-sans"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

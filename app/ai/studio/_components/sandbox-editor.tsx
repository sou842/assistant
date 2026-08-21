"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Folder,
  File,
  Plus,
  Trash2,
  FileCode2,
  ChevronRight,
  ChevronDown,
  X,
  FileEdit,
  Sparkles,
} from "lucide-react";
import { PreviewRenderer } from "./preview-renderer";
import { toast } from "sonner";

interface SandboxEditorProps {
  initialData?: string;
  onChange: (data: string) => void;
  readOnly?: boolean;
}

export function SandboxEditor({ initialData = "", onChange, readOnly = false }: SandboxEditorProps) {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>("app.tsx");
  const [openTabs, setOpenTabs] = useState<string[]>(["app.tsx"]);

  // File creating states
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // Parse initial files or convert legacy HTML
  useEffect(() => {
    let parsedFiles: Record<string, string> = {
      "app.tsx": `import React, { useState } from "react";
import { Sparkles, Activity } from "lucide-react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
        <div className="size-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Sparkles className="size-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Multi-File Sandbox
          </h1>
          <p className="text-sm text-zinc-400">
            Build clean modular projects in real-time. Edit files in the tree, add components, and watch them render.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={() => setCount(c => c + 1)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
          >
            Clicked {count} times
          </button>
        </div>
      </div>
    </div>
  );
}`,
      "styles.css": `/* Custom styles for your project */\nbody {\n  background-color: #09090b;\n}`,
    };

    if (initialData && initialData.trim()) {
      if (initialData.trim().startsWith("{")) {
        try {
          parsedFiles = JSON.parse(initialData);
        } catch (e) {
          console.error("Failed to parse sandbox files JSON:", e);
        }
      } else {
        // Legacy HTML: convert to react dangerous markup
        parsedFiles = {
          "app.tsx": `import React from "react";

export default function App() {
  return (
    <div className="p-6 bg-zinc-950 text-zinc-50 min-h-screen">
      <div dangerouslySetInnerHTML={{ __html: \`${initialData.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\` }} />
    </div>
  );
}`,
          "legacy.html": initialData,
        };
      }
    }

    setFiles(parsedFiles);

    // Pick first file as active file
    const fileKeys = Object.keys(parsedFiles);
    if (fileKeys.length > 0) {
      const defaultActive = fileKeys.find((k) => k === "app.tsx") || fileKeys[0];
      setActiveFile(defaultActive);
      setOpenTabs([defaultActive]);
    }
  }, [initialData]);

  // Sync edits to parent
  const handleFileChange = (content: string | undefined) => {
    if (!content || readOnly) return;
    const updated = { ...files, [activeFile]: content };
    setFiles(updated);
    onChange(JSON.stringify(updated));
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    // Check duplicate
    if (files[newFileName.trim()]) {
      toast.error("File already exists");
      return;
    }

    const name = newFileName.trim();
    let ext = name.split(".").pop() || "";
    let starter = "";
    if (ext === "tsx" || ext === "jsx") {
      starter = `import React from "react";\n\nexport default function Component() {\n  return (\n    <div className="p-4 border border-zinc-800 rounded-xl">\n      New Component\n    </div>\n  );\n}`;
    } else if (ext === "css") {
      starter = `/* Style sheet */`;
    }

    const updated = { ...files, [name]: starter };
    setFiles(updated);
    onChange(JSON.stringify(updated));
    setActiveFile(name);
    if (!openTabs.includes(name)) {
      setOpenTabs([...openTabs, name]);
    }
    setNewFileName("");
    setIsCreatingFile(false);
    toast.success(`File ${name} created`);
  };

  const handleDeleteFile = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (name === "app.tsx") {
      toast.error("Cannot delete primary entrypoint 'app.tsx'");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const updated = { ...files };
    delete updated[name];
    setFiles(updated);
    onChange(JSON.stringify(updated));

    // Handle active tab closing
    const newTabs = openTabs.filter((t) => t !== name);
    setOpenTabs(newTabs);

    if (activeFile === name) {
      const fallback = newTabs.length > 0 ? newTabs[0] : Object.keys(updated)[0] || "";
      setActiveFile(fallback);
      if (fallback && !newTabs.includes(fallback)) {
        setOpenTabs([...newTabs, fallback]);
      }
    }
    toast.success(`Deleted ${name}`);
  };

  const handleTabClose = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== name);
    setOpenTabs(newTabs);

    if (activeFile === name) {
      const fallback = newTabs.length > 0 ? newTabs[newTabs.length - 1] : Object.keys(files)[0] || "";
      setActiveFile(fallback);
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop();
    if (ext === "js" || ext === "jsx") return "javascript";
    if (ext === "ts" || ext === "tsx") return "typescript";
    if (ext === "css") return "css";
    if (ext === "json") return "json";
    if (ext === "html") return "html";
    return "plaintext";
  };

  return (
    <div className="flex w-full h-[calc(100vh-140px)] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden text-zinc-300">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
            Files
          </span>
          {!readOnly && (
            <button
              onClick={() => setIsCreatingFile(!isCreatingFile)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer"
              title="Add File"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Create File Input Form */}
        {isCreatingFile && (
          <form onSubmit={handleCreateFile} className="p-3 border-b border-zinc-800/60">
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. Button.tsx"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/80 focus:ring-0"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsCreatingFile(false)}
                className="px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-medium cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {Object.keys(files).map((name) => {
            const isActive = activeFile === name;
            return (
              <div
                key={name}
                onClick={() => {
                  setActiveFile(name);
                  if (!openTabs.includes(name)) {
                    setOpenTabs([...openTabs, name]);
                  }
                }}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400 font-semibold border border-blue-500/15"
                    : "hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 size={14} className={isActive ? "text-blue-400" : "text-zinc-500"} />
                  <span className="truncate">{name}</span>
                </div>
                {!readOnly && name !== "app.tsx" && (
                  <button
                    onClick={(e) => handleDeleteFile(e, name)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      <div className="flex-1 flex min-w-0">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800/80 bg-zinc-950">
          {/* Tabs */}
          <div className="flex bg-zinc-950 border-b border-zinc-800/60 overflow-x-auto scrollbar-none h-11">
            {openTabs.map((tab) => {
              const isActive = activeFile === tab;
              return (
                <div
                  key={tab}
                  onClick={() => setActiveFile(tab)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-mono border-r border-zinc-900 cursor-pointer select-none transition-all duration-150 h-full relative ${
                    isActive
                      ? "bg-zinc-900/40 text-zinc-200 border-b-2 border-b-blue-500"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20"
                  }`}
                >
                  <span>{tab}</span>
                  {tab !== "app.tsx" && (
                    <button
                      onClick={(e) => handleTabClose(e, tab)}
                      className="p-0.5 rounded-full hover:bg-zinc-800/60 text-zinc-600 hover:text-zinc-300 transition cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Monaco Code Editor */}
          <div className="flex-1 w-full bg-zinc-950 relative overflow-hidden py-2">
            {activeFile ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={getLanguage(activeFile)}
                value={files[activeFile] || ""}
                onChange={handleFileChange}
                options={{
                  readOnly,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollbar: {
                    vertical: "auto",
                    horizontal: "auto",
                  },
                  automaticLayout: true,
                  padding: { top: 8, bottom: 8 },
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 gap-2">
                <File size={32} />
                <span className="text-xs font-mono">Select a file to start editing</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="flex-1 flex flex-col bg-zinc-950 p-4 min-w-0">
          <PreviewRenderer files={files} entryPoint="app.tsx" />
        </div>
      </div>
    </div>
  );
}

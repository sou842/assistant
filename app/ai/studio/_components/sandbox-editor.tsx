"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
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
  id: string;
  initialData?: string;
  onChange: (data: string) => void;
  readOnly?: boolean;
  layoutMode?: "code" | "preview";
  setLayoutMode?: (mode: "code" | "preview") => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = [];

  const getOrCreateFolder = (parentChildren: TreeNode[], folderName: string, parentPath: string): TreeNode => {
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    let found = parentChildren.find(c => c.name === folderName && c.isFolder);
    if (!found) {
      found = {
        name: folderName,
        path: fullPath,
        isFolder: true,
        children: []
      };
      parentChildren.push(found);
    }
    return found;
  };

  for (const filePath of Object.keys(files)) {
    const isFolderEntry = filePath.endsWith('/');
    const cleanPath = isFolderEntry ? filePath.slice(0, -1) : filePath;
    const parts = cleanPath.split('/');

    let currentLevel = root;
    let parentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      const isLast = i === parts.length - 1;
      const partPath = parentPath ? `${parentPath}/${part}` : part;

      if (isLast && !isFolderEntry) {
        currentLevel.push({
          name: part,
          path: filePath,
          isFolder: false,
          children: []
        });
      } else {
        const folder = getOrCreateFolder(currentLevel, part, parentPath);
        currentLevel = folder.children;
        parentPath = partPath;
      }
    }
  }

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.isFolder) {
        sortTree(node.children);
      }
    }
  };

  sortTree(root);
  return root;
}

export function SandboxEditor({ id, initialData = "", onChange, readOnly = false, layoutMode = "preview", setLayoutMode = () => {} }: SandboxEditorProps) {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>("app.tsx");
  const [openTabs, setOpenTabs] = useState<string[]>(["app.tsx"]);

  // Tree states
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "app": true,
  });
  const [createType, setCreateType] = useState<"file" | "folder" | null>(null);
  const [createParentPath, setCreateParentPath] = useState<string>("");
  const [createInputVal, setCreateInputVal] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameInputVal, setRenameInputVal] = useState("");

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const treeData = React.useMemo(() => buildTree(files), [files]);

  const lastSentDataRef = React.useRef<string>("");

  // Parse initial files or convert legacy HTML
  useEffect(() => {
    if (initialData && initialData === lastSentDataRef.current) {
      return;
    }

    let parsedFiles: Record<string, string> = {
      "app.tsx": `import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  const stats = [
    { title: "Total Users", value: "12,480", change: "+12.5%" },
    { title: "Revenue", value: "$48,290", change: "+8.2%" },
    { title: "Orders", value: "1,284", change: "+14.8%" },
    { title: "Conversion", value: "6.24%", change: "+2.4%" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-zinc-500">
              Welcome back, Sourav
            </p>
          </div>

          <button className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800">
            Export Report
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-8 py-8">
        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className="text-sm text-zinc-500">{stat.title}</p>

              <div className="mt-3 flex items-end justify-between">
                <h2 className="text-2xl font-semibold">{stat.value}</h2>

                <span className="text-sm text-green-400">
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Main Grid */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Revenue Overview</h2>
                <p className="text-sm text-zinc-500">
                  Monthly revenue performance
                </p>
              </div>

              <select className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
                <option>Last 6 months</option>
                <option>Last year</option>
              </select>
            </div>

            {/* Fake Chart */}
            <div className="flex h-64 items-end gap-3 border-b border-zinc-800 px-2">
              {[35, 50, 42, 65, 55, 72, 60, 82, 68, 90, 76, 95].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-md bg-zinc-700 transition hover:bg-zinc-500"
                    style={{ height: height }}
                  />
                )
              )}
            </div>

            <div className="mt-3 flex justify-between text-xs text-zinc-600">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>

          {/* Counter */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="font-semibold">Quick Counter</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Simple interactive example
            </p>

            <div className="flex h-64 flex-col items-center justify-center">
              <span className="text-6xl font-bold">{count}</span>

              <button
                onClick={() => setCount(count + 1)}
                className="mt-6 rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 active:scale-95"
              >
                Increase
              </button>

              <button
                onClick={() => setCount(0)}
                className="mt-3 text-sm text-zinc-500 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Recent Orders */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 p-6">
            <h2 className="font-semibold">Recent Orders</h2>
            <p className="text-sm text-zinc-500">
              Latest transactions from your store
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {[
                  ["#10231", "John Smith", "$240.00", "Completed"],
                  ["#10230", "Sarah Wilson", "$180.00", "Pending"],
                  ["#10229", "Michael Brown", "$320.00", "Completed"],
                  ["#10228", "Emma Davis", "$95.00", "Cancelled"],
                ].map((order) => (
                  <tr
                    key={order[0]}
                    className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40"
                  >
                    <td className="px-6 py-4 font-medium">{order[0]}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {order[1]}
                    </td>
                    <td className="px-6 py-4">{order[2]}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          order[3] === "Completed"
                            ? "text-green-400"
                            : order[3] === "Pending"
                            ? "text-yellow-400"
                            : "text-red-400"
                        }
                      >
                        {order[3]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
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

    // Pick first file as active file, preserving previous active if it still exists
    const fileKeys = Object.keys(parsedFiles);
    if (fileKeys.length > 0) {
      setActiveFile((prev) => {
        if (prev && fileKeys.includes(prev)) return prev;
        return fileKeys.find((k) => k === "app.tsx") || fileKeys[0];
      });
      setOpenTabs((prevTabs) => {
        const filtered = prevTabs.filter((t) => fileKeys.includes(t));
        return filtered.length > 0 ? filtered : [fileKeys.find((k) => k === "app.tsx") || fileKeys[0]];
      });
    }

    lastSentDataRef.current = initialData;
  }, [initialData]);

  // Sync edits to parent
  const handleFileChange = (content: string | undefined) => {
    if (!content || readOnly) return;
    const updated = { ...files, [activeFile]: content };
    setFiles(updated);
    const serialized = JSON.stringify(updated);
    lastSentDataRef.current = serialized;
    onChange(serialized);
  };

  const handleCreateSubmit = (parentPath: string, type: "file" | "folder", name: string) => {
    if (!name.trim()) {
      setCreateType(null);
      return;
    }
    const cleanName = name.trim();
    let targetPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
    
    if (type === "folder") {
      targetPath += "/";
      if (files[targetPath] !== undefined) {
        toast.error("Folder already exists");
        return;
      }
      const updated = { ...files, [targetPath]: "" };
      setFiles(updated);
      const serialized = JSON.stringify(updated);
      lastSentDataRef.current = serialized;
      onChange(serialized);
      setExpandedFolders(prev => ({
        ...prev,
        [parentPath]: true,
        [targetPath.slice(0, -1)]: true
      }));
    } else {
      if (files[targetPath] !== undefined) {
        toast.error("File already exists");
        return;
      }
      let ext = cleanName.split(".").pop() || "";
      let starter = "";
      if (ext === "tsx" || ext === "jsx") {
        starter = `import React from "react";\n\nexport default function Component() {\n  return (\n    <div className="p-4 border border-zinc-800 rounded-xl">\n      New Component\n    </div>\n  );\n}`;
      } else if (ext === "css") {
        starter = `/* Style sheet */`;
      }
      const updated = { ...files, [targetPath]: starter };
      setFiles(updated);
      const serialized = JSON.stringify(updated);
      lastSentDataRef.current = serialized;
      onChange(serialized);
      setActiveFile(targetPath);
      if (!openTabs.includes(targetPath)) {
        setOpenTabs([...openTabs, targetPath]);
      }
      if (parentPath) {
        setExpandedFolders(prev => ({ ...prev, [parentPath]: true }));
      }
    }
    setCreateType(null);
    setCreateInputVal("");
  };

  const handleRenameSubmit = (oldPath: string, isFolder: boolean, newName: string) => {
    if (!newName.trim()) {
      setRenamingPath(null);
      return;
    }
    const cleanNewName = newName.trim();
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = cleanNewName;
    const newPath = pathParts.join('/');

    if (isFolder) {
      const oldPrefix = oldPath + "/";
      const newPrefix = newPath + "/";
      
      if (Object.keys(files).some(k => k.startsWith(newPrefix))) {
        toast.error("Folder already exists");
        return;
      }

      const updated = { ...files };
      for (const key of Object.keys(files)) {
        if (key.startsWith(oldPrefix)) {
          const suffix = key.slice(oldPrefix.length);
          updated[newPrefix + suffix] = updated[key];
          delete updated[key];
        }
      }
      
      if (updated[oldPath + "/"] !== undefined) {
        updated[newPath + "/"] = updated[oldPath + "/"];
        delete updated[oldPath + "/"];
      }

      setFiles(updated);
      const serialized = JSON.stringify(updated);
      lastSentDataRef.current = serialized;
      onChange(serialized);

      setOpenTabs(prev => prev.map(t => t.startsWith(oldPrefix) ? newPrefix + t.slice(oldPrefix.length) : t));
      setActiveFile(prev => prev.startsWith(oldPrefix) ? newPrefix + prev.slice(oldPrefix.length) : prev);
      
      setExpandedFolders(prev => {
        const next = { ...prev };
        if (next[oldPath]) {
          next[newPath] = next[oldPath];
          delete next[oldPath];
        }
        for (const k of Object.keys(next)) {
          if (k.startsWith(oldPrefix.slice(0, -1))) {
            const nextKey = newPrefix.slice(0, -1) + k.slice(oldPrefix.slice(0, -1).length);
            next[nextKey] = next[k];
            delete next[k];
          }
        }
        return next;
      });

    } else {
      if (files[newPath] !== undefined) {
        toast.error("File already exists");
        return;
      }
      const updated = { ...files };
      updated[newPath] = updated[oldPath];
      delete updated[oldPath];

      setFiles(updated);
      const serialized = JSON.stringify(updated);
      lastSentDataRef.current = serialized;
      onChange(serialized);

      setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t));
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }
    }
    setRenamingPath(null);
    setRenameInputVal("");
  };

  const handleDeleteItem = (path: string, isFolder: boolean) => {
    if (path === "app.tsx") {
      toast.error("Cannot delete primary entrypoint 'app.tsx'");
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${isFolder ? "folder" : "file"} and all its contents?`)) {
      return;
    }

    const updated = { ...files };
    if (isFolder) {
      const prefix = path + "/";
      for (const key of Object.keys(files)) {
        if (key.startsWith(prefix) || key === prefix) {
          delete updated[key];
        }
      }
      setFiles(updated);
      const serialized = JSON.stringify(updated);
      lastSentDataRef.current = serialized;
      onChange(serialized);

      setOpenTabs(prev => {
        const filtered = prev.filter(t => !t.startsWith(prefix));
        if (activeFile.startsWith(prefix)) {
          const fallback = filtered.length > 0 ? filtered[0] : "app.tsx";
          setActiveFile(fallback);
        }
        return filtered;
      });
    } else {
      delete updated[path];
      setFiles(updated);
      const serialized = JSON.stringify(updated);
      lastSentDataRef.current = serialized;
      onChange(serialized);

      setOpenTabs(prev => {
        const filtered = prev.filter(t => t !== path);
        if (activeFile === path) {
          const fallback = filtered.length > 0 ? filtered[0] : "app.tsx";
          setActiveFile(fallback);
        }
        return filtered;
      });
    }
    toast.success(`Deleted ${path.split('/').pop()}`);
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

  const renderTreeNodes = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.path];
      const isRenaming = renamingPath === node.path;
      const isActive = activeFile === node.path;
      const showCreationInputHere = createParentPath === node.path && createType !== null;

      return (
        <div key={node.path} className="flex flex-col">
          <div
            onClick={(e) => {
              if (node.isFolder) {
                toggleFolder(node.path);
              } else {
                setActiveFile(node.path);
                if (!openTabs.includes(node.path)) {
                  setOpenTabs([...openTabs, node.path]);
                }
              }
            }}
            className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer select-none ${
              !node.isFolder && isActive
                ? "bg-app-primary/10 text-app-primary font-semibold border-l-2 border-l-app-primary/60 rounded-l-none"
                : "hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {node.isFolder ? (
                <span className="text-zinc-500 hover:text-zinc-300">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              ) : (
                <></>
              )}

              {node.isFolder ? (
                <Folder size={14} className={isExpanded ? "text-app-primary" : "text-zinc-500"} />
              ) : (
                <File size={14} className={isActive ? "text-app-primary" : "text-zinc-500"} />
              )}

              {isRenaming ? (
                <input
                  type="text"
                  value={renameInputVal}
                  onChange={(e) => setRenameInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRenameSubmit(node.path, node.isFolder, renameInputVal);
                    } else if (e.key === "Escape") {
                      setRenamingPath(null);
                    }
                  }}
                  onBlur={() => handleRenameSubmit(node.path, node.isFolder, renameInputVal)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-[11px] text-zinc-200 outline-none w-32 font-sans"
                />
              ) : (
                <span className="text-xs font-normal truncate">{node?.name}</span>
              )}
            </div>

            {!readOnly && !isRenaming && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {node.isFolder && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateParentPath(node.path);
                        setCreateType("file");
                        setCreateInputVal("");
                        setExpandedFolders(prev => ({ ...prev, [node.path]: true }));
                      }}
                      className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 transition cursor-pointer"
                      title="New File"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateParentPath(node.path);
                        setCreateType("folder");
                        setCreateInputVal("");
                        setExpandedFolders(prev => ({ ...prev, [node.path]: true }));
                      }}
                      className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 transition cursor-pointer"
                      title="New Folder"
                    >
                      <FolderPlus size={12} />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingPath(node.path);
                    setRenameInputVal(node.name);
                  }}
                  className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 transition cursor-pointer"
                  title="Rename"
                >
                  <FileEdit size={12} />
                </button>
                {node.path !== "app.tsx" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(node.path, node.isFolder);
                    }}
                    className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {node.isFolder && isExpanded && (
            <div className="flex flex-col border-l border-zinc-800/60 ml-[15px] pl-3 mt-0.5">
              {showCreationInputHere && (
                <div className="flex items-center gap-1.5 py-1 px-2">
                  {createType === "folder" ? (
                    <Folder size={14} className="text-zinc-500" />
                  ) : (
                    <File size={14} className="text-zinc-500" />
                  )}
                  <input
                    type="text"
                    value={createInputVal}
                    onChange={(e) => setCreateInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateSubmit(node.path, createType!, createInputVal);
                      } else if (e.key === "Escape") {
                        setCreateType(null);
                      }
                    }}
                    onBlur={() => handleCreateSubmit(node.path, createType!, createInputVal)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    placeholder={createType === "folder" ? "Folder name..." : "File name..."}
                    className="w-full rounded px-1.5 py-0.5 text-[11px] text-zinc-200 outline-none font-sans"
                  />
                </div>
              )}
              {renderTreeNodes(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex w-full h-[calc(100vh-80px)] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden text-zinc-300">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
            Files
          </span>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setCreateParentPath("");
                  setCreateType("file");
                  setCreateInputVal("");
                }}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer"
                title="New File"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => {
                  setCreateParentPath("");
                  setCreateType("folder");
                  setCreateInputVal("");
                }}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer"
                title="New Folder"
              >
                <FolderPlus size={15} />
              </button>
            </div>
          )}
        </div>

        {/* File List / Tree root */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {createParentPath === "" && createType !== null && (
            <div
              className="flex items-center gap-1.5 py-1 px-2"
            >
              <span className="w-3.5 h-3.5" />
              {createType === "folder" ? (
                <Folder size={14} className="text-zinc-500" />
              ) : (
                <File size={14} className="text-zinc-500" />
              )}
              <input
                type="text"
                value={createInputVal}
                onChange={(e) => setCreateInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateSubmit("", createType!, createInputVal);
                  } else if (e.key === "Escape") {
                    setCreateType(null);
                  }
                }}
                onBlur={() => handleCreateSubmit("", createType!, createInputVal)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                placeholder={createType === "folder" ? "Folder name" : "File name"}
                className="rounded px-1.5 py-0.5 text-xs text-zinc-200 outline-none w-full font-sans"
              />
            </div>
          )}
          {renderTreeNodes(treeData)}
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      <div className="flex-1 flex min-w-0">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800/80 bg-zinc-950">
          {/* Tabs */}
          <div className="flex bg-zinc-950 border-b border-zinc-800/60 overflow-x-auto scrollbar-none h-11 shrink-0">
            {openTabs.map((tab) => {
              const isActive = activeFile === tab;
              return (
                <div
                  key={tab}
                  onClick={() => setActiveFile(tab)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-mono border-r border-zinc-900 cursor-pointer select-none transition-all duration-150 h-full relative ${
                    isActive
                      ? "bg-zinc-900/40 text-zinc-200 border-b-2 border-b-app-primary"
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
        {layoutMode !== "code" && (
          <div className="flex-1 flex flex-col bg-zinc-950 p-4 min-w-0">
            <PreviewRenderer 
              id={id}
              files={files} 
              entryPoint="app.tsx" 
              layoutMode={layoutMode} 
              setLayoutMode={setLayoutMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}

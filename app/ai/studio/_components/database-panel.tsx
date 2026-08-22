"use client";

import React, { useEffect, useState } from "react";
import { Database, RotateCcw, Trash2, Key, HelpCircle, Save, X, Edit3 } from "lucide-react";
import { toast } from "sonner";

interface DatabasePanelProps {
  id: string;
}

export function DatabasePanel({ id }: DatabasePanelProps) {
  const [db, setDb] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const fetchDb = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studio/${id}/db`);
      const data = await res.json();
      if (res.ok) {
        setDb(data.db || {});
      } else {
        toast.error(data.error || "Failed to load database");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDb();
  }, [id]);

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all database keys? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/studio/${id}/db`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      });
      if (res.ok) {
        setDb({});
        toast.success("Database cleared");
      } else {
        toast.error("Failed to clear database");
      }
    } catch (err) {
      toast.error("Error clearing database");
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Are you sure you want to delete key "${key}"?`)) {
      return;
    }
    const updated = { ...db };
    delete updated[key];

    try {
      const res = await fetch(`/api/studio/${id}/db`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updated }),
      });
      if (res.ok) {
        setDb(updated);
        toast.success(`Deleted key "${key}"`);
      } else {
        toast.error("Failed to delete key");
      }
    } catch (err) {
      toast.error("Error deleting key");
    }
  };

  const handleStartEdit = (key: string) => {
    setEditingKey(key);
    setEditingValue(JSON.stringify(db[key], null, 2));
  };

  const handleSaveEdit = async (key: string) => {
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(editingValue);
      } catch (e) {
        // If it's not valid JSON, treat it as a string
        parsedValue = editingValue;
      }

      const res = await fetch(`/api/studio/${id}/db`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: parsedValue }),
      });

      if (res.ok) {
        const data = await res.json();
        setDb(data.db || {});
        setEditingKey(null);
        toast.success(`Updated key "${key}"`);
      } else {
        toast.error("Failed to update key");
      }
    } catch (err) {
      toast.error("Error parsing or updating value");
    }
  };

  const keys = Object.keys(db);

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-500" />
          <span className="text-xs font-semibold text-zinc-300 font-mono select-none tracking-tight">
            Key-Value Database
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchDb}
            disabled={loading}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh Database"
          >
            <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {keys.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition active:scale-95 cursor-pointer"
              title="Clear All Keys"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Database Content View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
        {loading && keys.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <RotateCcw size={20} className="animate-spin mr-2 text-blue-500" />
            <span>Fetching database state...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center rounded-xl max-w-md mx-auto my-2">
            <Database size={32} className="text-zinc-600 mb-3" />
            <h4 className="font-semibold text-zinc-300 mb-1">No Database Records</h4>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Write or set values in your React sandbox code using the global client library:
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex gap-3">
            {keys.map((key) => {
              const value = db[key];
              const valueType = Array.isArray(value) ? "array" : typeof value;
              const isEditing = editingKey === key;

              return (
                <div
                  key={key}
                  className="w-full h-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-2 hover:border-zinc-700/60 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-zinc-500" />
                      <span className="font-mono font-semibold text-zinc-200">{key}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                        {valueType}
                      </span>
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(key)}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                          title="Edit Value"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteKey(key)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                          title="Delete Key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        rows={4}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 font-mono outline-none focus:border-blue-500/50"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-850 hover:bg-zinc-800 rounded-md transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(key)}
                          className="px-2.5 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md transition cursor-pointer font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="w-full h-full bg-zinc-950/80 border border-zinc-850 rounded-lg p-3 text-xs text-zinc-400 font-mono overflow-x-auto select-all">
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

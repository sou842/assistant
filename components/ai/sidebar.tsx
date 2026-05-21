"use client";

import React from "react";
import {
  Bot,
  Brain,
  Database,
  FileText,
  MessageCircle,
  Palette,
  PanelLeftClose,
  PenTool,
  Settings2,
  SquarePlus,
  Trash2,
  Pencil,
  Check,
  X,
  Ellipsis,
  BookOpenCheck,
  Layers,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { StoredChat } from "@/lib/chat-storage";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarWidth: number;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  chats: StoredChat[];
  activeChatId: string;
  createNewChat: () => void;
  removeChat: (id: string) => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  sidebarWidth,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  chats,
  activeChatId,
  createNewChat,
  removeChat,
  onSelectChat,
  onRenameChat,
}: SidebarProps) {
  const isCollapsed = !sidebarOpen;
  const pathname = usePathname();
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");

  const handleNewChat = () => {
    createNewChat();
    if (pathname !== "/ai") {
      router.push("/ai");
    }
  };

  const startEditing = (e: React.MouseEvent, chat: StoredChat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleRename = () => {
    if (editingId && editingTitle.trim()) {
      onRenameChat(editingId, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") setEditingId(null);
  };

  return (
    <>
      {mobileSidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#111] bg-[#000000] md:static md:z-10 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } transition-all duration-300 ease-in-out`}
        style={{ width: isCollapsed ? 76 : sidebarWidth }}
      >
        {/* Header */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-[#111] h-16 shrink-0`}>
          {isCollapsed ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 bg-white/95 rounded-full flex items-center justify-center text-black shrink-0 cursor-pointer"
            >
              <Bot size={20} />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-black shrink-0">
                  <Bot size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">Jarvis AI</span>
                  <span className="text-xs text-white/40 font-medium truncate uppercase tracking-wider">Neural Shell</span>
                </div>
              </div>
              <button
                className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all md:block hidden shrink-0 cursor-pointer"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-3 space-y-8 scrollbar-hide ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Workspace Section */}
          <div className={`${isCollapsed ? 'w-full flex flex-col items-center gap-4' : 'w-full flex flex-col gap-1'}`}>
            {!isCollapsed && <div className="px-3 py-2 text-xs font-medium text-white/20">Workspace</div>}
            <button
              onClick={handleNewChat}
              className={`flex items-center transition-all group cursor-pointer ${isCollapsed
                ? "w-10 h-10 justify-center rounded-full bg-white/5 hover:bg-white/10"
                : "w-full gap-3 px-3 py-2.5 rounded-xl text-white font-medium text-sm hover:bg-white/10"
                }`}
            >
              <SquarePlus size={16} className="text-white/40 group-hover:text-white transition-colors shrink-0" />
              {!isCollapsed && <span>New Chat</span>}
            </button>
            <SidebarNavItem
              active={pathname === "/ai/tasks"}
              href="/ai/tasks"
              icon={<BookOpenCheck size={16} />}
              isCollapsed={isCollapsed}
              label="Tasks"
            />
            <SidebarNavItem
              active={pathname === "/ai/memory"}
              href="/ai/memory"
              icon={<Brain size={16} />}
              isCollapsed={isCollapsed}
              label="Memory"
            />
            <SidebarNavItem
              active={pathname === "/ai/integrations"}
              href="/ai/integrations"
              icon={<Layers size={16} />}
              isCollapsed={isCollapsed}
              label="Integrations"
            />
            <SidebarNavItem
              active={pathname?.startsWith("/ai/schedule")}
              href="/ai/schedule"
              icon={<Calendar size={16} />}
              isCollapsed={isCollapsed}
              label="Schedule"
            />
            <SidebarNavItem
              active={pathname === "/ai/vault"}
              href="/ai/vault"
              icon={<Database size={16} />}
              isCollapsed={isCollapsed}
              label="Vault"
            />
          </div>

          {/* Recents Section */}
          {!isCollapsed && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-medium text-white/20">Recents</div>
              <div className="space-y-0.5">
                {chats
                  .slice()
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((chat) => (
                    <div
                      className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 transition-all cursor-pointer ${chat.id === activeChatId ? "bg-white/5 text-white" : "text-white/40 hover:bg-white/[0.02] hover:text-white/80"
                        }`}
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <MessageCircle size={18} className={`shrink-0 transition-opacity ${chat.id === activeChatId ? "opacity-100 text-indigo-400" : "opacity-40 group-hover:opacity-70"}`} />

                      {editingId === chat.id ? (
                        <input
                          autoFocus
                          className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-indigo-500/50"
                          onBlur={handleRename}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          value={editingTitle}
                        />
                      ) : (
                        <span className="flex-1 truncate text-sm font-medium tracking-tight">{chat.title}</span>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <div className="dropdown dropdown-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="rounded-lg p-1 hover:bg-white/5 hover:text-white"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            tabIndex={0}
                            type="button"
                          >
                            <Ellipsis size={14} />
                          </button>
                          <ul
                            className="dropdown-content z-[30] menu p-2 shadow-2xl bg-[#0F0F0F] border border-white/10 rounded-xl w-32 mt-2"
                            onClick={(e) => e.stopPropagation()}
                            tabIndex={0}
                          >
                            <li>
                              <button
                                className="flex items-center gap-2 py-2 text-xs hover:bg-white/5"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  startEditing(e, chat);
                                }}
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                            </li>
                            <li>
                              <button
                                className="flex items-center gap-2 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeChat(chat.id);
                                }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-0 border-t border-[#111] ${isCollapsed ? 'flex flex-col items-center space-y-6' : 'space-y-4'}`}>
          {/* <button className={`flex items-center transition-all group ${
            isCollapsed ? "justify-center" : "w-full gap-3 px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl"
          }`}>
            <Palette size={18} className={`transition-transform group-hover:rotate-12 ${isCollapsed ? 'text-white/40 hover:text-white' : ''}`} />
            {!isCollapsed && <span className="text-sm font-medium">Theme: Dark</span>}
          </button> */}

          {isCollapsed ? (
            <div
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 bg-white/90 text-black rounded-full mb-2 flex items-center justify-center text-[10px] font-bold shadow-inner cursor-pointertransition-all"
            >
              SS
            </div>
          ) : (
            <div className="p-3 rounded-2xl flex items-center gap-3 group cursor-pointer hover:border-white/10 transition-all">
              <div className="relative">
                <div className="w-9 h-9 bg-white/90 text-black rounded-full flex items-center justify-center text-xs font-bold shadow-inner">
                  SS
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white/70 truncate tracking-tight">Sourav Samanta</p>
                <p className="text-[10px] text-white/30 truncate font-medium">samantasourav732@gmail.com</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarNavItem({
  icon,
  label,
  active = false,
  isCollapsed = false,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isCollapsed?: boolean;
  href?: string;
}) {
  const content = (
    <div className={`flex items-center transition-all cursor-pointer group ${isCollapsed ? "w-6 h-6 justify-center rounded-xl" : "w-full gap-3 px-3 py-2 rounded-xl"
      } ${active ? "bg-white/5 text-white" : "text-white/40 hover:bg-white/[0.03] hover:text-white/80"
      }`}>
      <span className="text-white/40 group-hover:text-white transition-colors shrink-0">{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

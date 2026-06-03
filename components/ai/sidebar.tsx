"use client";

import React from "react";
import {
  Bot,
  Brain,
  Database,
  MessageCircle,
  PanelLeftClose,
  Trash2,
  Pencil,
  Ellipsis,
  BookOpenCheck,
  Layers,
  Calendar,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  isSyncing?: boolean;
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
  isSyncing,
}: SidebarProps) {
  const isCollapsed = !sidebarOpen;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");


  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleNewChat = () => {
    createNewChat();
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
          className="fixed inset-0 z-40 bg-app-overlay backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-app-border-default bg-app-canvas md:static md:z-10 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } transition-all duration-300 ease-in-out`}
        style={{ width: isCollapsed ? 76 : sidebarWidth }}
      >
        {/* Header */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-app-border-default h-16 shrink-0`}>
          {isCollapsed ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 bg-app-primary rounded-full flex items-center justify-center text-app-primary-foreground shrink-0 cursor-pointer"
            >
              <Bot size={20} />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-app-primary rounded-full flex items-center justify-center text-app-primary-foreground shrink-0">
                  <Bot size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-app-text-primary truncate">Jarvis AI</span>
                  <span className="text-xs text-app-text-muted font-medium truncate uppercase tracking-wider">Neural Shell</span>
                </div>
              </div>
              <button
                className="p-1.5 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-glass rounded-lg transition-all md:block hidden shrink-0 cursor-pointer"
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
            {!isCollapsed && <div className="px-3 py-2 text-xs font-medium text-app-text-faint">Workspace</div>}
            <button
              onClick={handleNewChat}
              className={`flex items-center transition-all group cursor-pointer ${isCollapsed
                ? "w-10 h-10 justify-center rounded-full bg-app-surface-glass hover:bg-app-surface-glass-strong"
                : "w-full gap-3 px-3 py-2.5 rounded-xl text-app-text-primary font-medium text-sm hover:bg-app-surface-glass-strong"
                }`}
            >
              <MessageSquare size={16} className="text-app-text-muted group-hover:text-app-text-primary transition-colors shrink-0" />
              {!isCollapsed && <span>New Chat</span>}
            </button>
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
              active={pathname === "/ai/tasks"}
              href="/ai/tasks"
              icon={<BookOpenCheck size={16} />}
              isCollapsed={isCollapsed}
              label="Tasks"
            />
            <SidebarNavItem
              href="/ai/vault"
              icon={<Database size={16} />}
              label="Vault"
              active={pathname.startsWith("/ai/vault")}
              isCollapsed={isCollapsed}
            />
            {/* <SidebarNavItem
              href="/ai/playground"
              icon={<Blocks size={16} />}
              label="Playground"
              active={pathname.startsWith("/ai/playground")}
              isCollapsed={isCollapsed}
            /> */}
          </div>

          {/* Recents Section */}
          {!isCollapsed && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-medium text-app-text-faint">Recents</div>
              <div className="space-y-0.5">
                {isSyncing ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2">
                      <div className="w-[18px] h-[18px] rounded-md bg-app-surface-glass shrink-0 animate-pulse" />
                      <div className="h-4 bg-app-surface-glass rounded-md flex-1 animate-pulse" />
                    </div>
                  ))
                ) : (
                  chats
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((chat) => (
                      <div
                        className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 transition-all cursor-pointer ${chat.id === activeChatId ? "bg-app-surface-glass text-app-text-primary" : "text-app-text-muted hover:bg-app-surface-glass-soft hover:text-app-text-secondary"
                          }`}
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                      >
                        <MessageCircle size={18} className={`shrink-0 transition-opacity ${chat.id === activeChatId ? "opacity-100 text-brand-primary" : "opacity-40 group-hover:opacity-70"}`} />

                        {editingId === chat.id ? (
                          <input
                            autoFocus
                            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-brand-primary"
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
                              className="rounded-lg p-1 hover:bg-app-surface-glass hover:text-app-text-primary"
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
                              className="dropdown-content z-[30] menu p-2 shadow-2xl bg-app-surface-elevated border border-app-border-default rounded-xl w-32 mt-2"
                              onClick={(e) => e.stopPropagation()}
                              tabIndex={0}
                            >
                              <li>
                                <button
                                  className="flex items-center gap-2 py-2 text-xs hover:bg-app-surface-glass"
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
                                  className="flex items-center gap-2 py-2 text-xs text-app-danger-strong hover:bg-app-danger-soft"
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
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-0 border-t border-app-border-default ${isCollapsed ? 'flex flex-col items-center space-y-6' : 'space-y-4'}`}>
          {isCollapsed ? (
            <div
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 bg-app-primary text-app-primary-foreground rounded-full mb-2 flex items-center justify-center text-[10px] font-bold shadow-inner cursor-pointer transition-all"
            >
              {initials}
            </div>
          ) : (
            <div className="dropdown dropdown-top w-full">
              <div tabIndex={0} role="button" className="p-3 flex items-center gap-3 group cursor-pointer hover:bg-app-surface-glass transition-all w-full text-left">
                <div className="relative">
                  <div className="w-9 h-9 bg-app-primary text-app-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-inner">
                    {initials}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-app-text-secondary truncate tracking-tight">{userName}</p>
                  <p className="text-[10px] text-app-text-muted truncate font-medium">{userEmail}</p>
                </div>
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-app-surface border border-app-border-default text-app-text-primary rounded-xl z-[1] w-full p-2 shadow-lg mb-2">
                <li><Link href="/ai/setting" className="hover:bg-app-surface-glass-strong rounded-lg">Settings</Link></li>
                <li><a onClick={() => signOut()} className="hover:bg-app-danger-soft text-app-danger-strong rounded-lg">Logout</a></li>
              </ul>
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
    <div className={`flex items-center transition-all cursor-pointer group text-sm ${isCollapsed ? "w-6 h-6 justify-center rounded-xl" : "w-full gap-3 px-3 py-2 rounded-xl"
      } ${active ? "bg-app-surface-glass text-app-text-primary" : "text-app-text-muted hover:bg-app-surface-glass-soft hover:text-app-text-secondary"
      }`}>
      <span className="text-app-text-muted group-hover:text-app-text-primary transition-colors shrink-0">{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

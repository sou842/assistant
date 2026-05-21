import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/ai/message-utils";

export const CHAT_STORAGE_KEY = "jarvis-chat-history-v1";
export const MIGRATION_KEY = "jarvis-chats-migrated";

export type StoredChat = {
  id: string;
  _id?: string; // MongoDB ID
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

export const deriveChatTitle = (messages: (UIMessage | undefined | null)[]) => {
  const validMessages = (messages || []).filter((m): m is UIMessage => !!m);
  const firstUser = validMessages.find((message) => message.role === "user");
  const text = firstUser ? getMessageText(firstUser).trim() : "";
  return text ? text.slice(0, 44) : "New Chat";
};

export const createEmptyChat = (): StoredChat => ({
  id: crypto.randomUUID(),
  messages: [],
  title: "New Chat",
  updatedAt: Date.now(),
});

export const loadLocalChats = (): StoredChat[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredChat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadStoredChats = async (): Promise<StoredChat[]> => {
  try {
    const response = await fetch('/api/chats');
    if (!response.ok) throw new Error('Failed to fetch from DB');
    const chats = await response.json();
    
    // Map MongoDB _id to id for frontend compatibility
    return chats.map((chat: any) => ({
      ...chat,
      id: chat._id,
      updatedAt: new Date(chat.updatedAt).getTime(),
    }));
  } catch (error) {
    console.error('Database load failed, falling back to local:', error);
    return loadLocalChats();
  }
};

export const loadChatDetails = async (id: string): Promise<StoredChat | null> => {
  try {
    const response = await fetch(`/api/chats/${id}`);
    
    if (response.status === 404) {
      const locals = loadLocalChats();
      return locals.find(c => c.id === id) || null;
    }
    
    if (!response.ok) throw new Error('Failed to fetch chat details');
    
    const chat = await response.json();
    return {
      ...chat,
      id: chat._id,
      messages: (chat.messages || []).map((m: any) => ({
        ...m,
        id: m.id || m._id || Math.random().toString(36).substring(7),
      })),
      updatedAt: new Date(chat.updatedAt).getTime(),
    };
  } catch (error) {
    console.error('Failed to load chat details:', error);
    // Fallback to local if id matches
    const locals = loadLocalChats();
    return locals.find(c => c.id === id) || null;
  }
};

export const saveStoredChat = async (chat: StoredChat) => {
  try {
    const response = await fetch(`/api/chats${chat.id ? `/${chat.id}` : ''}`, {
      method: chat.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chat),
    });
    const saved = await response.json();
    return { ...saved, id: saved._id };
  } catch (error) {
    console.error('Failed to save chat to database:', error);
  }
};

export const deleteStoredChat = async (id: string) => {
  try {
    const response = await fetch(`/api/chats/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete chat from database:', error);
    return false;
  }
};

/**
 * Migrates data from localStorage to MongoDB if not already done.
 */
export const syncChatsWithDatabase = async () => {
  if (typeof window === "undefined") return;
  
  const isMigrated = localStorage.getItem(MIGRATION_KEY);
  if (isMigrated) return;

  const localChats = loadLocalChats();
  if (localChats.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return;
  }

  try {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localChats),
    });

    if (response.ok) {
      localStorage.setItem(MIGRATION_KEY, "true");
      // Optional: Clear local storage or keep as backup
      // localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

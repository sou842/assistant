import { Plus, X, MessageSquare, Trash } from "lucide-react";

export function HistoryPanel({ showHistory, setShowHistory, savedChats }: {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  savedChats: any[];
}) {
  return (
    <div className={`fixed inset-0 top-0 left-0 right-0 bg-app-canvas/95 backdrop-blur-md z-50 transition-transform duration-300 flex flex-col ${showHistory ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="p-3 border-b border-app-border-default/20 flex justify-between items-center bg-app-surface/50">
        <button
          onClick={() => {
            window.parent.postMessage({ type: "FROM_NEXTJS", action: "NEW_CHAT" }, "*");
            setShowHistory(false);
          }}
          className="h-6 flex items-center justify-center gap-1 text-xs bg-app-surface-elevated hover:bg-app-surface-hover text-app-text-primary px-2.5 rounded-full border border-app-border-default/20 transition cursor-pointer"
        >
          <Plus size={14} /> New Chat
        </button>
        <span className="text-xs font-semibold text-app-text-primary uppercase tracking-wider">Conversations</span>
        <button
          onClick={() => {
            setShowHistory(false);
          }}
          className="w-6 h-6 flex items-center justify-center bg-app-surface-elevated hover:bg-app-surface-hover text-app-text-primary rounded-full border border-app-border-default/20 transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {savedChats.length === 0 ? (
          <div className="text-center text-xs text-app-text-muted mt-10">No saved conversations.</div>
        ) : (
          savedChats?.map(chat => (
            <div
              key={chat.id}
              className="flex items-center justify-between py-2 pl-4 pr-2 rounded-full bg-app-surface border border-transparent hover:bg-app-surface-hover cursor-pointer group transition shadow-xs hover:shadow-sm"
              onClick={() => {
                window.parent.postMessage({ type: "FROM_NEXTJS", action: "LOAD_CHAT", chatId: chat.id }, "*");
                setShowHistory(false);
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={12} className="text-app-text-ghost shrink-0" />
                <span className="text-xs text-app-text-secondary truncate font-medium">{chat.title || "New Chat"}</span>
              </div>
              <button onClick={(e) => {
                e.stopPropagation();
                window.parent.postMessage({ type: "FROM_NEXTJS", action: "DELETE_CHAT", chatId: chat.id }, "*");
              }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-app-danger-soft hover:text-app-danger-strong text-app-text-muted rounded-full transition shrink-0 cursor-pointer">
                <Trash size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

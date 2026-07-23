import { Plus, X, MessageSquare, Trash } from "lucide-react";

export function HistoryPanel({ showHistory, setShowHistory, savedChats }: {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  savedChats: any[];
}) {
  return (
    <div className={`fixed inset-0 top-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md z-50 transition-transform duration-300 flex flex-col ${showHistory ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/50">
        <button
          onClick={() => {
            window.parent.postMessage({ type: "FROM_NEXTJS", action: "NEW_CHAT" }, "*");
            setShowHistory(false);
          }}
          className="h-6 flex items-center justify-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded-full transition cursor-pointer"
        >
          <Plus size={14} /> New Chat
        </button>
        <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Conversations</span>
        <button
          onClick={() => {
            setShowHistory(false);
          }}
          className="w-6 h-6 flex items-center justify-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {savedChats.length === 0 ? (
          <div className="text-center text-xs text-gray-500 mt-10">No saved conversations.</div>
        ) : (
          savedChats?.map(chat => (
            <div
              key={chat.id}
              className="flex items-center justify-between py-2 pl-4 pr-2 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer group transition"
              onClick={() => {
                window.parent.postMessage({ type: "FROM_NEXTJS", action: "LOAD_CHAT", chatId: chat.id }, "*");
                setShowHistory(false);
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={12} className="text-gray-500 shrink-0" />
                <span className="text-xs text-gray-300 truncate">{chat.title || "New Chat"}</span>
              </div>
              <button onClick={(e) => {
                e.stopPropagation();
                window.parent.postMessage({ type: "FROM_NEXTJS", action: "DELETE_CHAT", chatId: chat.id }, "*");
              }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-full transition shrink-0 cursor-pointer">
                <Trash size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

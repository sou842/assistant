import React, { memo } from "react";
import { User, Plus, Loader2, MessageSquare, Mail, Trash2, Monitor, X } from "lucide-react";
import { mistralModels, ModelItem } from "@/components/ai/chat-input";

export interface DynamicTopSectionProps {
  topSectionMode: "none" | "contacts" | "models";
  setTopSectionMode: (mode: "none" | "contacts" | "models") => void;
  isAddingContact: boolean;
  setIsAddingContact: (isAdding: boolean) => void;
  handleAddContact: (e: React.FormEvent) => Promise<void>;
  newContactName: string;
  setNewContactName: (name: string) => void;
  newContactValue: string;
  setNewContactValue: (val: string) => void;
  isSubmittingContact: boolean;
  filteredContacts: any[];
  selectContact: (contact: any) => void;
  handleDeleteContact: (e: React.MouseEvent, id: string) => void;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
}

export const DynamicTopSection = memo(({
  topSectionMode,
  setTopSectionMode,
  isAddingContact,
  setIsAddingContact,
  handleAddContact,
  newContactName,
  setNewContactName,
  newContactValue,
  setNewContactValue,
  isSubmittingContact,
  filteredContacts,
  selectContact,
  handleDeleteContact,
  selectedModel,
  setSelectedModel
}: DynamicTopSectionProps) => (
  <div className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${topSectionMode !== "none" ? "max-h-[400px] border-b border-app-border-subtle" : "max-h-0"}`}>
    {topSectionMode === "contacts" && (
      <div className="flex flex-col h-full bg-black/10">
        <div className="p-3 border-b border-app-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="size-3.5 text-app-text-muted" />
            <span className="text-xs font-semibold text-app-text-soft uppercase tracking-wider">Contacts</span>
          </div>
          {!isAddingContact && (
            <button 
              onClick={() => setIsAddingContact(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
        {isAddingContact ? (
          <form onSubmit={handleAddContact} className="p-3 flex flex-col gap-2 shrink-0">
            <input
              type="text"
              placeholder="Name"
              className="w-full bg-app-surface-glass border border-app-border-default rounded-full px-3 py-1.5 text-sm text-app-text-primary focus:outline-none focus:border-primary"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              placeholder="Phone or Email"
              className="w-full bg-app-surface-glass border border-app-border-default rounded-full px-3 py-1.5 text-sm text-app-text-primary focus:outline-none focus:border-primary"
              value={newContactValue}
              onChange={(e) => setNewContactValue(e.target.value)}
            />
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => setIsAddingContact(false)}
                className="text-xs px-3 py-1.5 rounded-full hover:bg-app-surface-glass text-app-text-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingContact}
                className="cursor-pointer text-xs px-3 py-1.5 rounded-full bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isSubmittingContact && <Loader2 className="size-3 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-hide">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact: any) => (
                <div
                  key={contact._id || contact.phone || contact.email || contact.name}
                  onClick={() => selectContact(contact)}
                  role="button"
                  tabIndex={0}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-app-surface-glass transition-colors text-left group cursor-pointer"
                >
                  <div className="size-9 rounded-xl bg-app-surface-glass border border-app-border-subtle flex items-center justify-center group-hover:border-app-border-default transition-colors">
                    {contact.phone && !contact.email ? (
                      <MessageSquare className="size-4 text-[#25d366]" />
                    ) : contact.email && !contact.phone ? (
                      <Mail className="size-4 text-blue-400" />
                    ) : (
                      <User className="size-4 text-app-text-muted group-hover:text-app-text-soft" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-sm font-medium text-app-text-primary truncate">{contact.name}</span>
                    <span className="text-[11px] text-app-text-muted truncate flex gap-1.5 items-center">
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.phone && contact.email && <span className="opacity-50">•</span>}
                      {contact.email && <span>{contact.email}</span>}
                    </span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                    {contact.phone && <MessageSquare className="size-3.5 text-[#25d366]" />}
                    {contact.email && <Mail className="size-3.5 text-blue-400" />}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteContact(e, contact._id)}
                      className="p-1 hover:bg-red-500/10 rounded text-red-400 transition-colors ml-1 cursor-pointer"
                      title="Delete contact"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-app-text-faint">No contacts found</p>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {topSectionMode === "models" && (
      <div className="flex flex-col h-full bg-black/10">
        <div className="p-3 border-b border-app-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="size-3.5 text-app-text-muted" />
            <span className="text-xs font-semibold text-app-text-soft uppercase tracking-wider">AI Models</span>
          </div>
          <button 
            onClick={() => setTopSectionMode("none")}
            className="text-app-text-muted hover:text-app-text-primary p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto scrollbar-hide p-2 space-y-1">
          {mistralModels?.map((model) => (
            <ModelItem 
              key={model.id} 
              m={model} 
              onSelect={(id) => { setSelectedModel(id); setTopSectionMode("none"); }} 
              selectedModel={selectedModel} 
            />
          ))}
        </div>
      </div>
    )}
  </div>
));
DynamicTopSection.displayName = "DynamicTopSection";

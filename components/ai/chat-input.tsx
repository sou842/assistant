"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { CheckIcon, Globe, PlusIcon, User, Search, MessageSquare, X, BookOpenCheck, Image as ImageIcon, FileText } from "lucide-react";
import { FileUIPart } from "ai";
import { toast } from "sonner";
import { type SendChatMessage } from "@/components/ai/types";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";

export const mistralModels = [
  { chefSlug: "mistral", id: "mistral-small-latest", name: "Mistral Small", providers: ["mistral"] },
  { chefSlug: "mistral", id: "mistral-large-latest", name: "Mistral Large", providers: ["mistral"] },
  { chefSlug: "mistral", id: "codestral-latest", name: "Codestral", providers: ["mistral"] },
  { chefSlug: "deepseek", id: "deepseek-reasoner", name: "DeepSeek R1", providers: ["deepseek"] },
  { chefSlug: "google", id: "gemini-2.5-flash", name: "Gemini Flash", providers: ["google"] },
  { chefSlug: "openai", id: "gpt-4o-mini", name: "GPT-4o Mini", providers: ["openai"] },
] as const;

export type ModelItemData = (typeof mistralModels)[number];

const AttachmentItem = memo(
  ({ attachment, onRemove }: { attachment: FileUIPart & { id: string }; onRemove: (id: string) => void }) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const handlePreviewClick = (e: React.MouseEvent) => {
      // Don't open lightbox if the file is still uploading
      if ('uploading' in attachment && attachment.uploading) return;
      if (attachment.url) {
        setIsLightboxOpen(true);
      }
    };

    return (
      <>
        <Attachment 
          data={attachment} 
          onRemove={() => onRemove(attachment.id)}
          className="!size-16 rounded-xl border border-white/10 shadow-md overflow-hidden bg-white/5 group transition-all hover:scale-105 duration-200 cursor-zoom-in"
          onClick={handlePreviewClick}
        >
          <AttachmentPreview />
          <AttachmentRemove className="!opacity-100 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white size-5 rounded-full flex items-center justify-center border border-white/10 top-1 right-1 absolute transition-colors p-0 [&>svg]:!size-2.5" />
        </Attachment>

        {isLightboxOpen && attachment.url && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button 
              type="button"
              className="absolute top-6 right-6 size-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="size-5" />
            </button>
            <img 
              src={attachment.url} 
              alt={attachment.filename || "Preview"} 
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }
);
AttachmentItem.displayName = "AttachmentItem";

const ModelItem = memo(
  ({ m, selectedModel, onSelect }: { m: ModelItemData; selectedModel: string; onSelect: (id: string) => void }) => (
    <ModelSelectorItem 
      onSelect={() => onSelect(m.id)} 
      value={m.id}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors data-[selected=true]:bg-white/5"
    >
      <div className="flex items-center justify-center size-6 rounded-full bg-white/60 border border-white/10">
        <ModelSelectorLogo provider={m.chefSlug} className="size-3.5 opacity-80" />
      </div>
      
      <div className="flex-1 flex flex-col">
        <ModelSelectorName className="text-sm font-medium text-white/90">
          {m.name}
        </ModelSelectorName>
      </div>

      {selectedModel === m.id && (
        <CheckIcon className="size-4 text-primary" />
      )}
    </ModelSelectorItem>
  )
);
ModelItem.displayName = "ModelItem";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="grid" className="!ml-0 !w-full justify-start flex flex-row flex-wrap gap-3 border-b border-white/5 bg-white/[0.01] px-1.5 py-1.5">
      {attachments.files.map((attachment) => (
        <AttachmentItem attachment={attachment} key={attachment.id} onRemove={attachments.remove} />
      ))}
    </Attachments>
  );
};

const AttachmentsExposer = ({
  onAttachmentsReady,
}: {
  onAttachmentsReady: (attachments: any) => void;
}) => {
  const attachments = usePromptInputAttachments();
  useEffect(() => {
    onAttachmentsReady(attachments);
  }, [attachments, onAttachmentsReady]);
  return null;
};

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  sendMessage: SendChatMessage;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  selectedModelData: ModelItemData | undefined;
  modelSelectorOpen: boolean;
  setModelSelectorOpen: (open: boolean) => void;
  selectedTask?: any | null;
  setSelectedTask?: (task: any | null) => void;
  space?: number;
  onShowGallerySidePanel?: (show: boolean, search?: string) => void;
  customFileToAttach?: any;
  onCustomFileAttached?: () => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  sendMessage,
  selectedModel,
  setSelectedModel,
  selectedModelData,
  modelSelectorOpen,
  setModelSelectorOpen,
  selectedTask,
  setSelectedTask,
  space=4,
  onShowGallerySidePanel,
  customFileToAttach,
  onCustomFileAttached
}: ChatInputProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<any>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/contacts');
        const data = await res.json();
        setContacts(data.contacts || []);
      } catch (e) {
        console.error("Failed to fetch contacts", e);
      }
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    if (customFileToAttach && attachmentsRef.current) {
      const newInput = input?.replace(/@g:\w*$/, '');
      setInput(newInput);

      const alreadyAttached = attachmentsRef.current.files?.some(
        (f: any) => f.id === customFileToAttach.id
      );

      if (alreadyAttached) {
        toast.warning(`file is already attached`);
      } else {
        attachmentsRef.current.addCustomFile?.({
          id: customFileToAttach.id,
          filename: customFileToAttach.filename,
          url: customFileToAttach.url,
          mediaType: customFileToAttach.mediaType,
        });
        toast.success(`Attached "${customFileToAttach.filename}" from Gallery`);
      }

      onCustomFileAttached?.();
    }
  }, [customFileToAttach, input, setInput, onCustomFileAttached]);

  const handleInputChange = (value: string) => {
    setInput(value);
    const contactMatch = value.match(/@w:(\w*)$/);
    const galleryMatch = value.match(/@g:(\w*)$/);

    if (contactMatch) {
      setShowContactSelector(true);
      setContactSearch(contactMatch[1]);
      onShowGallerySidePanel?.(false);
    } else if (galleryMatch) {
      onShowGallerySidePanel?.(true, galleryMatch[1]);
      setShowContactSelector(false);
    } else {
      setShowContactSelector(false);
      if (!value.includes("@g:")) {
        onShowGallerySidePanel?.(false);
      }
    }
  };

  const selectContact = (contact: any) => {
    const newInput = input?.replace(/@w:\w*$/, '');
    setInput(newInput);
    setSelectedContact(contact);
    setShowContactSelector(false);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch)
  );

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-20 p-${space}`}>
      <div className="mx-auto w-full max-w-3xl relative">
        {/* Contact Selector Dropdown */}
        {showContactSelector && (
          <div 
            ref={selectorRef}
            className="absolute bottom-full left-0 mb-4 w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-3xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="p-3 border-b border-white/5 bg-white/2 flex items-center gap-2">
              <MessageSquare className="size-3.5 text-[#25d366]" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">WhatsApp Contacts</span>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.phone}
                    onClick={() => selectContact(contact)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="size-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-white/10 transition-colors">
                      <User className="size-4 text-white/40 group-hover:text-white/60" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{contact.name}</span>
                      <span className="text-[11px] text-white/30">{contact.phone}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-white/20">No contacts found</p>
                </div>
              )}
            </div>
          </div>
        )}

        <PromptInput
          className="pointer-events-auto bg-[#131313] rounded border-0 border-white/10 shadow-2xl transition-all duration-300"
          onSubmit={async (message) => {
            if (isLoading) return;
            const allFiles = attachmentsRef.current?.files || message.files || [];
            if (!message.text.trim() && allFiles.length === 0) return;
            
            let finalText = message.text;
            if (selectedContact) {
              finalText = `@WhatsApp:${selectedContact.name} (${selectedContact.phone})\n${message.text}`;
            }

            await sendMessage(
              {
                text: finalText,
                files: [],
              },
              {
                body: {
                  model: selectedModel,
                  customAttachments: allFiles,
                }
              }
            );
            
            attachmentsRef.current?.clear?.();
            setInput("");
            onShowGallerySidePanel?.(false);
          }}
        >
          <AttachmentsExposer onAttachmentsReady={(att) => { attachmentsRef.current = att; }} />
          <PromptInputAttachmentsDisplay />
          
          <PromptInputBody className="w-full flex flex-col items-start !justify-start">
            {/* Contact Badge Display */}
            {selectedContact && (
              <div className="px-6 pt-4 flex w-full justify-start items-center">
                <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full bg-[#25d366]/10 border border-[#25d366]/20 animate-in zoom-in-95 duration-200">
                  <svg className="size-3.5 text-[#25d366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="text-[13px] font-medium text-white/90 leading-none">
                    To: <span className="text-white font-bold">{selectedContact.name}</span>
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedContact(null);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Task Badge Display */}
            {selectedTask && (
              <div className="px-6 pt-4 flex w-full justify-start items-center">
                <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-in zoom-in-95 duration-200 max-w-[280px] overflow-hidden">
                  <BookOpenCheck className="size-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[13px] font-medium text-white/90 leading-none truncate flex items-center gap-1 min-w-0">
                    <span className="shrink-0">Focusing on:</span>
                    <span className="text-white font-bold truncate">{selectedTask.title}</span>
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedTask?.(null);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}
            
            <PromptInputTextarea
              className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none pt-5 pb-3 px-6 max-h-56 min-h-[60px] text-[15px] font-normal tracking-tight placeholder:text-white/30 scrollbar-hide text-white text-left"
              onChange={(event) => handleInputChange(event.currentTarget.value)}
              placeholder="What would you like to know?"
              value={input}
            />
          </PromptInputBody>
          
          <PromptInputFooter className="px-5 pb-4 pt-0 flex items-center justify-between">
            <PromptInputTools className="gap-2">
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger className="p-0 bg-transparent rounded-full size-8 flex items-center justify-center border-none text-white/60 hover:text-white transition-colors cursor-pointer">
                  <PlusIcon className="size-4" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent className="rounded-2xl shadow-3xl bg-[#131313] border border-white/10 p-1">
                  <PromptInputActionAddAttachments className="rounded-lg hover:bg-white/5" />
                  <PromptInputActionAddScreenshot className="rounded-lg hover:bg-white/5" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              
              <PromptInputButton className="flex items-center justify-center gap-2 rounded-full p-2 pr-2.5 bg-transparent border-none text-white/60 hover:text-white transition-colors cursor-pointer">
                <Globe size={15} />
                <span className="text-sm font-medium">Search</span>
              </PromptInputButton>

              <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton className="flex items-center justify-center gap-2 rounded-full p-2 pr-2.5 bg-transparent border-none text-white/60 hover:text-white transition-colors cursor-pointer">
                    {selectedModelData?.chefSlug && <ModelSelectorLogo className="size-3.5 opacity-60" provider={selectedModelData.chefSlug} />}
                    <span className="text-sm font-medium">{selectedModelData?.name}</span>
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent className="rounded-2xl shadow-3xl bg-[#0f0f0f] border border-white/10 min-w-[300px] p-2 overflow-hidden">
                  <div className="px-2 pt-2 pb-1">
                    <ModelSelectorInput 
                      className="bg-white/5 border border-white/5 rounded-xl h-10 px-3 text-sm focus-within:border-white/10 transition-all" 
                      placeholder="Search models..." 
                    />
                  </div>
                  <ModelSelectorList className="p-1 max-h-[400px] overflow-y-auto scrollbar-hide">
                    <ModelSelectorEmpty className="text-xs text-white/20 py-8 text-center">No models found.</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Available Models" className="px-2 py-3">
                      <div className="space-y-1 mt-2">
                        {mistralModels.map((model) => (
                          <ModelItem key={model.id} m={model} onSelect={(id) => setSelectedModel(id)} selectedModel={selectedModel} />
                        ))}
                      </div>
                    </ModelSelectorGroup>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit
              className={`transition-all duration-200 rounded-lg size-8 flex items-center justify-center ${
                input?.trim() || isLoading || selectedContact
                  ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/20" 
                  : "bg-white/5 text-white/20"
              }`}
              status={isLoading ? "submitted" : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

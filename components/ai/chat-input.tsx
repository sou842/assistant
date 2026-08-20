"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { CheckIcon, Globe, PlusIcon, User, Search, MessageSquare, X, BookOpenCheck, Image as ImageIcon, FileText, Table2, Mail, Loader2, Trash2, Plus, Monitor } from "lucide-react";
import { FileUIPart } from "ai";
import { toast } from "sonner";
import { type SendChatMessage } from "@/components/ai/types";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionContact,
  PromptInputActionGallery,
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
import { DynamicTopSection } from "@/components/ai/dynamic-top-section";
import { Button } from "../ui/button";

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
          className="!size-16 rounded-xl border border-app-border-default shadow-md overflow-hidden bg-app-surface-glass group transition-all hover:scale-105 duration-200 cursor-zoom-in"
          onClick={handlePreviewClick}
        >
          <AttachmentPreview />
          <AttachmentRemove className="!opacity-100 bg-app-canvas/60 hover:bg-app-canvas/80 backdrop-blur-sm text-app-text-primary size-5 rounded-full flex items-center justify-center border border-app-border-default top-1 right-1 absolute transition-colors p-0 [&>svg]:!size-2.5" />
        </Attachment>

        {isLightboxOpen && attachment.url && (
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-app-canvas/85 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              type="button"
              className="absolute top-6 right-6 size-10 rounded-full bg-app-surface-glass-strong hover:bg-white/20 border border-app-border-default text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="size-5" />
            </button>
            <img
              src={attachment.url}
              alt={attachment.filename || "Preview"}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-app-border-subtle animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }
);
AttachmentItem.displayName = "AttachmentItem";

export const ModelItem = memo(
  ({ m, selectedModel, onSelect }: { m: ModelItemData; selectedModel: string; onSelect: (id: string) => void }) => (
    <div
      onClick={() => onSelect(m.id)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-app-surface-glass data-[selected=true]:bg-app-surface-glass"
      data-selected={selectedModel === m.id}
    >
      <div className="flex items-center justify-center size-6 rounded-full bg-white/60 border border-app-border-default">
        <ModelSelectorLogo provider={m.chefSlug} className="size-3.5 opacity-80" />
      </div>

      <div className="flex-1 flex flex-col">
        <span className="text-sm font-medium text-app-text-secondary">
          {m.name}
        </span>
      </div>

      {selectedModel === m.id && (
        <CheckIcon className="size-4 text-primary" />
      )}
    </div>
  )
);
ModelItem.displayName = "ModelItem";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="grid" className="!ml-0 !w-full justify-start flex flex-row flex-wrap gap-3 border-b border-app-border-subtle bg-white/[0.01] px-1.5 py-1.5">
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
  stop?: () => void;
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
  className?: string;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  sendMessage,
  stop,
  selectedModel,
  setSelectedModel,
  selectedModelData,
  modelSelectorOpen,
  setModelSelectorOpen,
  selectedTask,
  setSelectedTask,
  space = 4,
  onShowGallerySidePanel,
  customFileToAttach,
  onCustomFileAttached,
  className
}: ChatInputProps) {
  const { data: contactsData, mutate: mutateContacts } = useSWR('/api/contacts', (url: string) => fetch(url).then(res => res.json()));
  const contacts = contactsData?.contacts || [];
  const [topSectionMode, setTopSectionMode] = useState<"none" | "contacts" | "models">("none");
  const [isFocused, setIsFocused] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactValue, setNewContactValue] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<any>(null);

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
    const contactMatch = value?.match(/@c:(\w*)$/);
    const galleryMatch = value?.match(/@g:(\w*)$/);

    if (contactMatch) {
      if (topSectionMode !== "contacts") mutateContacts();
      setTopSectionMode("contacts");
      setContactSearch(contactMatch[1]);
      onShowGallerySidePanel?.(false);
    } else if (galleryMatch) {
      onShowGallerySidePanel?.(true, galleryMatch[1]);
      setTopSectionMode("none");
    } else {
      if (topSectionMode === "contacts") setTopSectionMode("none");
      if (!value.includes("@g:")) {
        onShowGallerySidePanel?.(false);
      }
    }
  };

  const selectContact = (contact: any) => {
    const newInput = input?.replace(/@c:\w*$/, '');
    setInput(newInput);
    setSelectedContact(contact);
    setTopSectionMode("none");
  };

  const handleDeleteContact = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      await mutateContacts();
      toast.success("Contact deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredContacts = contacts.filter((c: any) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(contactSearch)) ||
    (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactValue) {
      toast.error("Name and contact detail are required");
      return;
    }

    let phone = "";
    let email = "";

    if (/^\S+@\S+\.\S+$/.test(newContactValue)) {
      email = newContactValue;
    } else if (/^\+?\d{10,15}$/.test(newContactValue.replace(/[^0-9+]/g, ''))) {
      phone = newContactValue;
    } else {
      toast.error("Please enter a valid phone number or email");
      return;
    }

    setIsSubmittingContact(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContactName,
          phone: phone || undefined,
          email: email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      await mutateContacts();
      setIsAddingContact(false);
      setNewContactName("");
      setNewContactValue("");
      toast.success("Contact added successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  return (
    <div className={className || `absolute bottom-0 left-0 right-0 z-20 p-${space}`}>
      <div className="mx-auto w-full max-w-3xl relative pointer-events-auto">
        
        {/* Unified Card Container */}
        <div className={`flex flex-col bg-app-surface-elevated/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-300 overflow-hidden border border-transparent ${
          isFocused ? "shadow-[0_0_24px_rgba(255,255,255,0.04)] bg-app-surface-elevated" : ""
        }`}>
          
          {/* Dynamic Top Section */}
          <DynamicTopSection
            topSectionMode={topSectionMode}
            setTopSectionMode={setTopSectionMode}
            isAddingContact={isAddingContact}
            setIsAddingContact={setIsAddingContact}
            handleAddContact={handleAddContact}
            newContactName={newContactName}
            setNewContactName={setNewContactName}
            newContactValue={newContactValue}
            setNewContactValue={setNewContactValue}
            isSubmittingContact={isSubmittingContact}
            filteredContacts={filteredContacts}
            selectContact={selectContact}
            handleDeleteContact={handleDeleteContact}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />

          <PromptInput
            className="w-full bg-black/5"
            onSubmit={async (message) => {
              if (isLoading) return;
              const allFiles = attachmentsRef.current?.files || message.files || [];
              if (!message.text.trim() && allFiles.length === 0) return;

              let finalText = message.text;
              if (selectedContact) {
                const contactInfo = [];
                if (selectedContact.phone) contactInfo.push(selectedContact.phone);
                if (selectedContact.email) contactInfo.push(selectedContact.email);
                finalText = `@Contact:${selectedContact.name} (${contactInfo.join(', ')})\n${message.text}`;
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
                <div className={`flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full border animate-in zoom-in-95 duration-200 ${selectedContact.phone ? 'bg-[#25d366]/10 border-[#25d366]/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                  {selectedContact.phone ? (
                    <svg className="size-3.5 text-[#25d366]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  ) : (
                    <Mail className="size-3.5 text-blue-400" />
                  )}
                  <span className="text-[13px] font-medium text-app-text-secondary leading-none">
                    To: <span className="text-app-text-primary font-bold">{selectedContact.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedContact(null);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-app-surface-glass-strong text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Task Badge Display */}
            {selectedTask && (
              <div className="px-6 pt-4 flex w-full justify-start items-center">
                <div className={`w-fit flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full border animate-in zoom-in-95 duration-200 max-w-full overflow-hidden ${
                  selectedTask.type === "note" ? "bg-blue-500/10 border-blue-500/20" :
                  selectedTask.type === "spreadsheet" ? "bg-emerald-500/10 border-emerald-500/20" :
                  "bg-indigo-500/10 border-indigo-500/20"
                }`}>
                  {selectedTask.type === "note" ? (
                    <FileText className="size-3.5 text-blue-400 shrink-0" />
                  ) : selectedTask.type === "spreadsheet" ? (
                    <Table2 className="size-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <BookOpenCheck className="size-3.5 text-indigo-400 shrink-0" />
                  )}
                  <span className="text-[13px] font-medium text-app-text-secondary leading-none truncate flex items-center gap-1 min-w-0">
                    <span className="shrink-0">Focusing on:</span>
                    <span className="text-app-text-primary font-bold truncate">{selectedTask.title}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedTask?.(null);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-app-surface-glass-strong text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}

            <PromptInputTextarea
              className="w-full bg-transparent border-none focus:ring-0 outline-none  pt-5 pb-3 px-6 max-h-[300px] h-auto min-h-[80px] text-sm font-normal tracking-tight placeholder:text-app-text-muted scrollbar-hide text-app-text-primary text-left"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(event) => handleInputChange(event.currentTarget.value)}
              placeholder="How can Jarvis help you today?"
              value={input}
            />
          </PromptInputBody>

          <PromptInputFooter className="px-5 pb-4 pt-0 flex items-center justify-between">
            <PromptInputTools className="gap-2">
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger className="p-0 bg-transparent rounded-full size-8 flex items-center justify-center border-none text-app-text-soft hover:text-app-text-primary transition-colors cursor-pointer">
                  <PlusIcon className="size-4" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent className="rounded-2xl shadow-3xl bg-app-surface border border-app-border-default p-1">
                  <PromptInputActionAddAttachments className="rounded-lg hover:bg-app-surface-glass cursor-pointer" />
                  <PromptInputActionContact className="rounded-lg hover:bg-app-surface-glass cursor-pointer" onSelect={() => setTopSectionMode("contacts")} />
                  <PromptInputActionGallery className="rounded-lg hover:bg-app-surface-glass cursor-pointer" onSelect={() => onShowGallerySidePanel?.(true)} />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <Button
                variant="outline"
                onClick={() => setTopSectionMode(prev => prev === "models" ? "none" : "models")}
                className={`flex items-center justify-center gap-1 rounded-full py-1.5 pl-2 pr-2.5 transition-all cursor-pointer ${topSectionMode === "models" ? "bg-white/10 text-app-text-primary" : "bg-white/5 border border-transparent hover:border-white/5 text-app-text-soft hover:text-app-text-primary/80"}`}
              >
                {selectedModelData?.chefSlug && <ModelSelectorLogo className="size-4.5 opacity-60" provider={selectedModelData.chefSlug} />}
                <span className="text-xs font-medium">{selectedModelData?.name}</span>
              </Button>
            </PromptInputTools>
            <PromptInputSubmit
              className={`transition-all duration-200 rounded-full size-8 flex items-center justify-center cursor-pointer ${input?.trim() || isLoading || selectedContact
                ? "bg-app-primary text-app-primary-foreground hover:bg-app-primary-hover shadow-md"
                : "bg-app-surface-glass text-app-text-faint"
                }`}
              status={isLoading ? "streaming" : undefined}
              onStop={stop}
            />
          </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

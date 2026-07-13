"use client";

import React, { useState, useRef, useEffect, KeyboardEvent, forwardRef, useImperativeHandle } from "react";
import { Workflow, AppWindow, Globe, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowItem {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
}

interface OpenTab {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  url?: string;
}

export interface MentionTag {
  type: 'w' | 't' | 'p';
  id?: string;
  label: string;
  url?: string;
}

interface MentionsInputProps {
  value: string;
  onChange: (val: string) => void;
  onEnter: () => void;
  disabled?: boolean;
  placeholder?: string;
  workflows: WorkflowItem[];
  tags: MentionTag[];
  onTagsChange: (tags: MentionTag[]) => void;
}

export interface MentionsInputRef {
  triggerMention: (type: 'w' | 't' | 'p') => void;
}

export const MentionsInput = forwardRef<MentionsInputRef, MentionsInputProps>(({
  value,
  onChange,
  onEnter,
  disabled,
  placeholder,
  workflows,
  tags,
  onTagsChange
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    triggerMention: (type: 'w' | 't' | 'p') => {
      if (!editorRef.current) return;
      editorRef.current.focus();

      const selection = window.getSelection();
      if (!selection) return;

      let range: Range;
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const triggerText = `@${type}:`;
      const textNode = document.createTextNode(triggerText);
      range.insertNode(textNode);

      // Place cursor right after the text we inserted
      const cursorRange = document.createRange();
      cursorRange.setStart(textNode, triggerText.length);
      cursorRange.setEnd(textNode, triggerText.length);
      selection.removeAllRanges();
      selection.addRange(cursorRange);

      // Set the mention range to highlight/replace the `@type:` trigger
      const triggerRange = document.createRange();
      triggerRange.setStart(textNode, 0);
      triggerRange.setEnd(textNode, triggerText.length);

      setMentionRange(triggerRange);
      setMentionType(type);
      setMentionQuery("");
      setSelectedIndex(0);

      parseContent();
    }
  }));

  const [mentionType, setMentionType] = useState<'w' | 't' | 'p' | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // To keep track of where to replace the text
  const [mentionRange, setMentionRange] = useState<Range | null>(null);

  const [openTabs, setOpenTabs] = useState<any[]>([]);
  const [recentPages, setRecentPages] = useState<any[]>([]);

  // Request tabs or history from extension when triggered
  useEffect(() => {
    if (mentionType === 't') {
      window.parent.postMessage({ type: "FROM_NEXTJS", action: "REQUEST_OPEN_TABS" }, "*");
    } else if (mentionType === 'p') {
      window.parent.postMessage({ type: "FROM_NEXTJS", action: "REQUEST_RECENT_PAGES" }, "*");
    }
  }, [mentionType]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "FROM_EXTENSION") {
        if (e.data?.action === "OPEN_TABS_RESULT") {
          setOpenTabs(e.data.tabs || []);
        } else if (e.data?.action === "RECENT_PAGES_RESULT") {
          setRecentPages(e.data.pages || []);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Sync external value clearing (like after sending a message)
  useEffect(() => {
    if (value === "" && editorRef.current && editorRef.current.innerHTML !== "") {
      editorRef.current.innerHTML = "";
    }
  }, [value]);

  const parseContent = () => {
    if (!editorRef.current) return;

    let plainText = "";
    const extractedTags: MentionTag[] = [];

    // Iterate over child nodes to extract text and tags
    editorRef.current.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        plainText += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-mention-type')) {
          const type = el.getAttribute('data-mention-type') as 'w' | 't' | 'p';
          const id = el.getAttribute('data-mention-id') || undefined;
          const label = el.getAttribute('data-mention-label') || '';
          const url = el.getAttribute('data-mention-url') || undefined;

          extractedTags.push({ type, id, label, url });
          // Add a plain text representation for the prompt so the LLM has context
          plainText += `@[${label}]`;
        } else {
          plainText += el.innerText || el.textContent;
        }
      }
    });

    onChange(plainText);
    onTagsChange(extractedTags);
  };

  const handleInput = () => {
    parseContent();
    checkMentionTrigger();
  };

  const checkMentionTrigger = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || "";
      const mentionMatch = textBeforeCursor.match(/(^|\s)@(w|t|p):([^\s]*)$/);

      if (mentionMatch) {
        const type = mentionMatch[2] as 'w' | 't' | 'p';
        const query = mentionMatch[3];

        // Save the exact range of the typed trigger so we can replace it later
        const matchStartOffset = textBeforeCursor.lastIndexOf(`@${type}:`);
        const newRange = document.createRange();
        newRange.setStart(node, matchStartOffset);
        newRange.setEnd(node, range.startOffset);

        setMentionRange(newRange);
        setMentionType(type);
        setMentionQuery(query);
        setSelectedIndex(0);
        return;
      }
    }

    setMentionType(null);
    setMentionRange(null);
  };

  const getFilteredItems = () => {
    const q = mentionQuery.toLowerCase();
    if (mentionType === 'w') {
      return workflows.filter(w => w.name?.toLowerCase().includes(q) || w.title?.toLowerCase().includes(q));
    }
    if (mentionType === 't') {
      return openTabs.filter(t => t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q));
    }
    if (mentionType === 'p') {
      return recentPages.filter(p => p.title?.toLowerCase().includes(q) || p.url?.toLowerCase().includes(q));
    }
    return [];
  };

  const filteredItems = getFilteredItems();

  const handleSelectMention = (itemText: string, itemId?: string, itemUrl?: string) => {
    if (!mentionRange || !editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    // Create the pill element
    const pill = document.createElement('span');
    pill.contentEditable = "false";
    pill.setAttribute('data-mention-type', mentionType!);
    pill.setAttribute('data-mention-id', itemId || '');
    pill.setAttribute('data-mention-label', itemText);
    if (itemUrl) {
      pill.setAttribute('data-mention-url', itemUrl);
    }

    // Styling the pill to look exactly like the UI wanted
    let colorClasses = "";
    if (mentionType === 'w') {
      colorClasses = "bg-brand-primary/20 border-brand-primary/50 text-brand-primary";
    } else if (mentionType === 't') {
      colorClasses = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
    } else {
      colorClasses = "bg-gray-300/20 border-gray-300/50 text-gray-300";
    }

    pill.className = `inline-flex items-center gap-1 border pl-1.5 pr-2 py-1 rounded-full text-[10px] font-medium mx-1 align-middle select-none ${colorClasses}`;

    // Add icon based on type (using simple unicode or emoji for simplicity in contenteditable, or inline SVG)
    let iconSvg = '';
    if (mentionType === 'w') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>`;
    } else if (mentionType === 't') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>`;
    } else {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
    }

    pill.innerHTML = `${iconSvg} <span>${itemText}</span>`;

    // Replace the text trigger with the pill
    selection.removeAllRanges();
    selection.addRange(mentionRange);
    selection.deleteFromDocument();

    // Insert pill
    const range = selection.getRangeAt(0);
    range.insertNode(pill);

    // Add a trailing space after the pill and move cursor there
    const spaceNode = document.createTextNode('\u00A0'); // non-breaking space
    pill.parentNode?.insertBefore(spaceNode, pill.nextSibling);

    range.setStartAfter(spaceNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    setMentionType(null);
    setMentionRange(null);
    parseContent();

    editorRef.current.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (mentionType && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          const item = filteredItems[selectedIndex];
          handleSelectMention(item.name || item.title || '', item._id || item.id, item.url);
        }
      } else if (e.key === 'Escape') {
        setMentionType(null);
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onEnter();
      }
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
          mentionType ? "max-h-[350px] border-b border-white/5 mb-2" : "max-h-0"
        )}
      >
        {mentionType && (
          <div className="flex flex-col h-full">
            <div className="p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mentionType === 'w' ? <Workflow className="size-3.5 text-brand-primary" /> : mentionType === 't' ? <AppWindow className="size-3.5 text-gray-300" /> : <Globe className="size-3.5 text-gray-300" />}
                <span className="text-xs font-semibold uppercase tracking-wider">
                  <span className="text-gray-400">
                    {mentionType === 'w' ? "Workflows" : mentionType === 't' ? "Open Tabs" : "Recent Pages"}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMentionType(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-1 max-h-[250px] flex flex-col gap-1">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                  No matches found
                </div>
              ) : (
                filteredItems.map((item, idx) => (
                  <button
                    type="button"
                    key={item._id || item.id || idx}
                    onClick={() => handleSelectMention(item.name || item.title || '', item._id || item.id, item.url)}
                    className={cn(
                      "w-full text-left pl-1 pr-2 py-1 rounded-full flex items-center justify-between transition-colors cursor-pointer",
                      selectedIndex === idx ? "bg-brand-primary/20" : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        {mentionType === 'w' ? <Workflow size={14} className="text-brand-primary" /> : mentionType === 't' ? <AppWindow size={14} className="text-gray-300" /> : <Globe size={14} className="text-gray-400" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-xs font-medium text-zinc-200">{item.name || item.title}</span>
                        {item.url && <span className="truncate text-[10px] text-zinc-500">{item.url}</span>}
                      </div>
                    </div>
                    {selectedIndex === idx && (
                      <Check className="size-4 text-zinc-300 shrink-0 ml-4" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="w-full max-h-40 min-h-[44px] bg-transparent text-sm text-zinc-100 px-3 pt-2 outline-none overflow-y-auto"
        style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
      />

      {/* Placeholder simulation since contentEditable doesn't have a native placeholder attribute */}
      {value === "" && !mentionType && (
        <div className="absolute left-3 top-2 pointer-events-none text-zinc-500 text-sm">
          {placeholder}
        </div>
      )}
    </div>
  );
});

MentionsInput.displayName = "MentionsInput";
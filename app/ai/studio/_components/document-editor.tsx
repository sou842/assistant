"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, MousePointer2, Type } from "lucide-react";

interface DocumentEditorProps {
  initialData?: string;
  onChange: (data: string) => void;
  readOnly?: boolean;
  onSelectionChange?: (selection: { text: string, html: string } | null) => void;
}

export function DocumentEditor({ initialData = "", onChange, readOnly = false, onSelectionChange }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialData || "");
  const [isInspectorMode, setIsInspectorMode] = useState(false);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);

  // Initialize/sync content
  useEffect(() => {
    if (editorRef.current) {
      let safeData = initialData || "";
      safeData = safeData.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      safeData = safeData.replace(/<\/?(?:html|head|body)[^>]*>/gi, '');

      const currentHTML = editorRef.current.innerHTML.replace(/\sdata-inspector-(?:hover|selected)="true"/g, '');
      if (currentHTML !== safeData) {
        editorRef.current.innerHTML = safeData;
      }
    }
  }, [initialData]);

  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!onSelectionChangeRef.current || !editorRef.current) return;
      if (isInspectorMode) return; // Prevent native selection from clearing inspector selection

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
        onSelectionChangeRef.current(null);
        return;
      }

      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;

      // Ensure the selection is inside the editor
      if (!editorRef.current.contains(container)) {
        onSelectionChangeRef.current(null);
        return;
      }

      // If it's a text node, get the parent element to capture the HTML tag context
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as Node;
      }

      onSelectionChangeRef.current({
        text: selection.toString(),
        html: (container as HTMLElement).outerHTML || (container as HTMLElement).innerHTML || selection.toString()
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [isInspectorMode]); // Re-bind if mode changes (though technically not needed, it's safer)

  // Inspector Mode Hover & Select Effect
  useEffect(() => {
    if (!isInspectorMode || !editorRef.current) {
      if (hoveredElementRef.current) {
        hoveredElementRef.current.removeAttribute('data-inspector-hover');
        hoveredElementRef.current = null;
      }
      return;
    }

    const editor = editorRef.current;

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target === editor) return;

      if (hoveredElementRef.current && hoveredElementRef.current !== target) {
        hoveredElementRef.current.removeAttribute('data-inspector-hover');
      }

      target.setAttribute('data-inspector-hover', 'true');
      hoveredElementRef.current = target;
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === hoveredElementRef.current) {
        target.removeAttribute('data-inspector-hover');
        hoveredElementRef.current = null;
      }
    };

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const scrollContainer = document.getElementById("document-scroll-container");
      if (scrollContainer && scrollContainer.contains(target)) {
        if (!editor.contains(target) || target === editor) {
          if (selectedElementRef.current) {
            selectedElementRef.current.removeAttribute('data-inspector-selected');
            selectedElementRef.current = null;
            if (onSelectionChangeRef.current) onSelectionChangeRef.current(null);
          }
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target === editor) {
        if (selectedElementRef.current) {
          selectedElementRef.current.removeAttribute('data-inspector-selected');
          selectedElementRef.current = null;
          if (onSelectionChangeRef.current) onSelectionChangeRef.current(null);
        }
        return;
      }

      // Clear previous selection
      if (selectedElementRef.current) {
        selectedElementRef.current.removeAttribute('data-inspector-selected');
      }

      target.setAttribute('data-inspector-selected', 'true');
      selectedElementRef.current = target;

      if (onSelectionChangeRef.current) {
        onSelectionChangeRef.current({
          text: target.innerText,
          html: target.outerHTML.replace(/\sdata-inspector-(?:hover|selected)="true"/g, '')
        });
      }
    };

    editor.addEventListener("mouseover", handleMouseOver);
    editor.addEventListener("mouseout", handleMouseOut);
    editor.addEventListener("click", handleClick, { capture: true });

    const scrollContainer = document.getElementById("document-scroll-container");
    if (scrollContainer) {
      scrollContainer.addEventListener("click", handleContainerClick);
    }

    return () => {
      editor.removeEventListener("mouseover", handleMouseOver);
      editor.removeEventListener("mouseout", handleMouseOut);
      editor.removeEventListener("click", handleClick, { capture: true });
      if (scrollContainer) {
        scrollContainer.removeEventListener("click", handleContainerClick);
      }
      if (hoveredElementRef.current) {
        hoveredElementRef.current.removeAttribute('data-inspector-hover');
      }
    };
  }, [isInspectorMode]);

  // Clean up selected element if it gets removed or mode changes (optional, we keep it active)
  useEffect(() => {
    if (!isInspectorMode && selectedElementRef.current) {
      selectedElementRef.current.removeAttribute('data-inspector-selected');
      selectedElementRef.current = null;
      if (onSelectionChangeRef.current) onSelectionChangeRef.current(null);
    }
  }, [isInspectorMode]);

  const handleInput = () => {
    if (editorRef.current) {
      let newContent = editorRef.current.innerHTML;
      // Strip out the inspector data attributes so they don't get saved to the DB
      newContent = newContent.replace(/\sdata-inspector-(?:hover|selected)="true"/g, '');
      setContent(newContent);
      onChange(newContent);
    }
  };

  const execCommand = (command: string, value?: string) => {
    if (readOnly) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6] text-black">
      {/* TOOLBAR */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 justify-center">

          <div className="flex bg-gray-100 p-0.5 rounded-md mr-2">
            <button
              onClick={() => setIsInspectorMode(false)}
              className={`p-1.5 rounded-sm transition-colors ${!isInspectorMode ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
              title="Edit Mode (Text Cursor)"
            >
              <Type size={16} />
            </button>
            <button
              onClick={() => setIsInspectorMode(true)}
              className={`p-1.5 rounded-sm transition-colors ${isInspectorMode ? 'bg-white shadow-sm text-indigo-500' : 'text-gray-500 hover:text-black'}`}
              title="Inspector Mode (Select Sections)"
            >
              <MousePointer2 size={16} />
            </button>
          </div>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarButton icon={<Bold size={16} />} onClick={() => execCommand('bold')} tooltip="Bold" />
          <ToolbarButton icon={<Italic size={16} />} onClick={() => execCommand('italic')} tooltip="Italic" />
          <ToolbarButton icon={<Underline size={16} />} onClick={() => execCommand('underline')} tooltip="Underline" />
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarButton icon={<AlignLeft size={16} />} onClick={() => execCommand('justifyLeft')} tooltip="Align Left" />
          <ToolbarButton icon={<AlignCenter size={16} />} onClick={() => execCommand('justifyCenter')} tooltip="Align Center" />
          <ToolbarButton icon={<AlignRight size={16} />} onClick={() => execCommand('justifyRight')} tooltip="Align Right" />
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarButton icon={<List size={16} />} onClick={() => execCommand('insertUnorderedList')} tooltip="Bullet List" />
          <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => execCommand('insertOrderedList')} tooltip="Numbered List" />
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <select
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            className="h-8 px-2 text-sm border border-gray-300 rounded outline-none hover:bg-gray-50"
          >
            <option value="P">Paragraph</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
          </select>
        </div>
      )}

      {/* A4 PAGE CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center w-full" id="document-scroll-container">
        <div
          ref={editorRef}
          className={`document-content outline-none w-full ${isInspectorMode ? '' : 'cursor-text'}`}
          contentEditable={!readOnly && !isInspectorMode}
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ minHeight: '100%' }}
        />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@100;200;300;400;500;700&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=PT+Mono&family=Roboto:wght@100;300;400;500;700;900&display=swap');

        #document-page {
          height: auto !important;
          min-height: 297mm !important;
        }
        .document-content {
          font-family: 'Roboto', sans-serif;
          color: #111827;
          height: auto !important;
        }
        .document-content div, .document-content section {
          height: auto !important;
        }
        .document-content h1 { font-family: 'Montserrat', sans-serif; font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; margin-top: 2rem; color: #111111; }
        .document-content h2 { font-family: 'Montserrat', sans-serif; font-size: 1.75rem; font-weight: bold; margin-bottom: 0.75rem; margin-top: 1.5rem; color: #111111; }
        .document-content h3 { font-family: 'Montserrat', sans-serif; font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; margin-top: 1.25rem; color: #111111; }
        .document-content p { margin-bottom: 1rem; line-height: 1.6; color: #111827; }
        .document-content code, .document-content pre, .document-content .mono { font-family: 'PT Mono', monospace; }
        .document-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .document-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .document-content li { margin-bottom: 0.25rem; }
        
        .document-content [data-inspector-hover="true"]:not([data-inspector-selected="true"]) {
          box-shadow: 0 0 0 2px #6366f1 !important;
          cursor: pointer !important;
        }
        
        .document-content [data-inspector-selected="true"] {
          box-shadow: 0 0 0 3px #10b981 !important;
          background-color: rgba(16, 185, 129, 0.05) !important;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
      type="button"
    >
      {icon}
    </button>
  );
}

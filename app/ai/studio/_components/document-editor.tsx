"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, MousePointer2, Type } from "lucide-react";

interface DocumentEditorProps {
  initialData?: string;
  onChange: (data: string) => void;
  readOnly?: boolean;
  onSelectionChange?: (selection: { text: string, html: string } | null) => void;
}

const IFRAME_TEMPLATE = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Document Editor Frame</title>
      <script>
        window.tailwind = window.tailwind || {};
        window.tailwind.config = {
          corePlugins: { preflight: false }
        };
      </script>
      <script src="https://cdn.tailwindcss.com" async></script>
      <style id="editor-styles">
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          background-color: transparent;
        }
        body {
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          justify-content: center;
          box-sizing: border-box;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@100;200;300;400;500;700&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=PT+Mono&family=Roboto:wght@100;300;400;500;700;900&display=swap');

        #document-page {
          height: auto !important;
          min-height: 297mm !important;
        }
        .document-content {
          font-family: 'Roboto', sans-serif;
          color: #111827;
          height: auto !important;
          min-height: 100%;
          box-sizing: border-box;
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
      </style>
    </head>
    <body>
      <div id="editor-root" style="width: 100%; height: 100%; display: flex; justify-content: center;"></div>
    </body>
  </html>
`;

export function DocumentEditor({ initialData = "", onChange, readOnly = false, onSelectionChange }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialData || "");
  const [isInspectorMode, setIsInspectorMode] = useState(false);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);

  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const handleIframeLoad = () => {
    setIframeReady(true);
  };

  // Initialize/sync content once iframe is ready
  useEffect(() => {
    if (editorRef.current) {
      let safeData = initialData || "";
      safeData = safeData.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      safeData = safeData.replace(/<\/?(?:html|head|body)[^>]*>/gi, '');

      const currentHTML = editorRef.current.innerHTML.replace(/\sdata-inspector-(?:hover|selected)="true"/g, '');
      if (currentHTML !== safeData) {
        editorRef.current.innerHTML = safeData;

        // Re-inject scripts so they execute in the iframe context
        const iframeDoc = editorRef.current.ownerDocument;
        const scripts = editorRef.current.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = iframeDoc.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(iframeDoc.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }
  }, [initialData, iframeReady]);

  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!onSelectionChangeRef.current || !editorRef.current || !iframeRef) return;
      if (isInspectorMode) return;

      const iframeWindow = iframeRef.contentWindow;
      if (!iframeWindow) return;
      const selection = iframeWindow.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
        onSelectionChangeRef.current(null);
        return;
      }

      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;

      if (!editorRef.current.contains(container)) {
        onSelectionChangeRef.current(null);
        return;
      }

      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as Node;
      }

      onSelectionChangeRef.current({
        text: selection.toString(),
        html: (container as HTMLElement).outerHTML || (container as HTMLElement).innerHTML || selection.toString()
      });
    };

    const doc = iframeRef?.contentDocument || iframeRef?.contentWindow?.document;
    if (!doc) return;

    doc.addEventListener("selectionchange", handleSelectionChange);
    return () => doc.removeEventListener("selectionchange", handleSelectionChange);
  }, [isInspectorMode, iframeRef, iframeReady]);

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

    const iframeDoc = editor.ownerDocument;
    const iframeBody = iframeDoc.body;
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (iframeBody && iframeBody.contains(target)) {
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
    iframeBody.addEventListener("click", handleContainerClick);

    return () => {
      editor.removeEventListener("mouseover", handleMouseOver);
      editor.removeEventListener("mouseout", handleMouseOut);
      editor.removeEventListener("click", handleClick, { capture: true });
      iframeBody.removeEventListener("click", handleContainerClick);
      if (hoveredElementRef.current) {
        hoveredElementRef.current.removeAttribute('data-inspector-hover');
      }
    };
  }, [isInspectorMode, iframeReady]);

  const handleInput = () => {
    if (editorRef.current) {
      let newContent = editorRef.current.innerHTML;
      newContent = newContent.replace(/\sdata-inspector-(?:hover|selected)="true"/g, '');
      setContent(newContent);
      onChange(newContent);
    }
  };

  const execCommand = (command: string, value?: string) => {
    if (readOnly) return;
    const doc = iframeRef?.contentDocument || iframeRef?.contentWindow?.document;
    if (!doc) return;
    doc.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const mountNode = iframeRef?.contentDocument?.getElementById("editor-root");

  return (
    <div className="flex flex-col h-full bg-transparent text-app-text-primary">
      {/* TOOLBAR */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 bg-app-surface-elevated border-b border-app-border-default shadow-xs sticky top-0 z-10 justify-center">
          <div className="flex bg-app-surface-glass border border-app-border-subtle p-0.5 rounded-lg mr-2">
            <button
              onClick={() => setIsInspectorMode(false)}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${!isInspectorMode ? 'bg-app-surface-elevated text-brand-primary shadow-xs' : 'text-app-text-muted hover:text-app-text-primary'}`}
              title="Edit Mode (Text Cursor)"
            >
              <Type size={16} />
            </button>
            <button
              onClick={() => setIsInspectorMode(true)}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${isInspectorMode ? 'bg-app-surface-elevated text-brand-primary shadow-xs' : 'text-app-text-muted hover:text-app-text-primary'}`}
              title="Inspector Mode (Select Sections)"
            >
              <MousePointer2 size={16} />
            </button>
          </div>
          <div className="w-px h-5 bg-app-border-default mx-1" />

          <ToolbarButton icon={<Bold size={16} />} onClick={() => execCommand('bold')} tooltip="Bold" />
          <ToolbarButton icon={<Italic size={16} />} onClick={() => execCommand('italic')} tooltip="Italic" />
          <ToolbarButton icon={<Underline size={16} />} onClick={() => execCommand('underline')} tooltip="Underline" />
          <div className="w-px h-5 bg-app-border-default mx-1" />
          <ToolbarButton icon={<AlignLeft size={16} />} onClick={() => execCommand('justifyLeft')} tooltip="Align Left" />
          <ToolbarButton icon={<AlignCenter size={16} />} onClick={() => execCommand('justifyCenter')} tooltip="Align Center" />
          <ToolbarButton icon={<AlignRight size={16} />} onClick={() => execCommand('justifyRight')} tooltip="Align Right" />
          <div className="w-px h-5 bg-app-border-default mx-1" />
          <ToolbarButton icon={<List size={16} />} onClick={() => execCommand('insertUnorderedList')} tooltip="Bullet List" />
          <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => execCommand('insertOrderedList')} tooltip="Numbered List" />
          <div className="w-px h-5 bg-app-border-default mx-1" />
          <select
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            className="h-8 px-2.5 text-xs bg-app-surface border border-app-border-default rounded-lg outline-none hover:bg-app-surface-hover text-app-text-primary transition-colors cursor-pointer"
          >
            <option value="P">Paragraph</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
          </select>
        </div>
      )}
 
      {/* A4 PAGE CONTAINER */}
      <div className="flex-1 w-full h-full relative" id="document-scroll-container">
        <iframe
          ref={setIframeRef}
          onLoad={handleIframeLoad}
          srcDoc={IFRAME_TEMPLATE}
          className="w-full h-full border-none bg-transparent"
          title="document-editor-iframe"
        />
        {iframeReady && mountNode && createPortal(
          <div
            ref={editorRef}
            className={`document-content outline-none w-full ${isInspectorMode ? '' : 'cursor-text'}`}
            contentEditable={!readOnly && !isInspectorMode}
            suppressContentEditableWarning
            onInput={handleInput}
            style={{ minHeight: '100%' }}
          />,
          mountNode
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="p-1.5 text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-glass rounded-lg transition-colors cursor-pointer"
      type="button"
    >
      {icon}
    </button>
  );
}

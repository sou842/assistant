"use client";
// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import { compressImage } from "@/lib/utils";

interface NoteEditorProps {
  initialData?: any;
  onChange: (data: any) => void;
}

export function NoteEditor({ initialData, onChange }: NoteEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    if (editorRef.current) return;

    if (containerRef.current) {
      // Dynamic imports for Editor.js tools to avoid SSR issues
      Promise.all([
        import('@editorjs/header'),
        import('@editorjs/list'),
        import('@editorjs/paragraph'),
        import('@editorjs/code'),
        import('@editorjs/quote'),
        import('@editorjs/table'),
        import('@editorjs/inline-code'),
        import('editorjs-inline-image'),
        import('editorjs-youtube-embed'),
        import('@editorjs/marker'),
        import('@editorjs/warning'),
        import('@editorjs/checklist'),
        import('@editorjs/delimiter'),
        import('editorjs-drag-drop'),
      ]).then(([
        Header,
        List,
        Paragraph,
        Code,
        Quote,
        Table,
        InlineCode,
        InlineImage,
        YouTubeEmbed,
        Marker,
        Warning,
        Checklist,
        Delimiter,
        DragDrop
      ]) => {
        if (!isCurrent) return;

        // Custom YouTube wrapper logic from reference
        class CustomYouTubeEmbed {
          constructor({ data, config, api, readOnly }: any) {
            this.youTubeEmbed = new YouTubeEmbed.default({ data, config, api, readOnly });
          }
          static get toolbox() {
            const originalToolbox = YouTubeEmbed.default.toolbox;
            return {
              ...originalToolbox,
              title: "Video / YouTube",
            };
          }
          render() { return this.youTubeEmbed.render(); }
          save(blockContent: any) { return this.youTubeEmbed.save(blockContent); }
        }

        let parsedData = undefined;
        if (typeof initialData === 'string' && initialData.trim() !== '') {
          // Check if it's stringified JSON
          if (initialData.trim().startsWith('{')) {
            try {
              parsedData = JSON.parse(initialData);
            } catch (e) {
              console.error("Failed to parse initialData as JSON", e);
            }
          }

          // If not JSON or parsing failed, try markdown parser
          if (!parsedData) {
            const blocks: any[] = [];
            const lines = initialData.split('\n');
            let currentParagraph = "";

            for (const line of lines) {
              if (line.startsWith('# ')) {
                if (currentParagraph) { blocks.push({ type: 'paragraph', data: { text: currentParagraph } }); currentParagraph = ""; }
                blocks.push({ type: 'header', data: { text: line.replace('# ', ''), level: 1 } });
              } else if (line.startsWith('## ')) {
                if (currentParagraph) { blocks.push({ type: 'paragraph', data: { text: currentParagraph } }); currentParagraph = ""; }
                blocks.push({ type: 'header', data: { text: line.replace('## ', ''), level: 2 } });
              } else if (line.startsWith('### ')) {
                if (currentParagraph) { blocks.push({ type: 'paragraph', data: { text: currentParagraph } }); currentParagraph = ""; }
                blocks.push({ type: 'header', data: { text: line.replace('### ', ''), level: 3 } });
              } else if (line.trim() === '') {
                if (currentParagraph) {
                  blocks.push({ type: 'paragraph', data: { text: currentParagraph } });
                  currentParagraph = "";
                }
              } else {
                currentParagraph += (currentParagraph ? '<br>' : '') + line;
              }
            }
            if (currentParagraph) {
              blocks.push({ type: 'paragraph', data: { text: currentParagraph } });
            }

            parsedData = {
              time: Date.now(),
              blocks,
              version: '2.8.1'
            };
          }
        } else if (initialData && typeof initialData === 'object' && Object.keys(initialData).length > 0) {
          parsedData = initialData;
        }

        const editor = new EditorJS({
          holder: containerRef.current!,
          data: parsedData,
          placeholder: 'Start writing your content...',
          tools: {
            header: {
              class: Header.default || Header,
              config: {
                levels: [1, 2, 3, 4],
                defaultLevel: 2,
              },
              inlineToolbar: true,
            },
            list: {
              class: List.default || List,
              inlineToolbar: true,
            },
            paragraph: {
              class: Paragraph.default || Paragraph,
              inlineToolbar: true,
            },
            code: Code.default || Code,
            quote: {
              class: Quote.default || Quote,
              inlineToolbar: true,
            },
            table: {
              class: Table.default || Table,
              inlineToolbar: true,
            },
            inlineCode: InlineCode.default || InlineCode,
            inlineImage: {
              class: InlineImage.default || InlineImage,
              inlineToolbar: true,
              config: {
                embed: { display: true },
                uploader: {
                  async uploadByFile(file: File) {
                    try {
                      const compressedFile = await compressImage(file);
                      const formData = new FormData();
                      formData.append("file", compressedFile);

                      const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (!res.ok) {
                        throw new Error("Upload failed");
                      }

                      const data = await res.json();
                      return {
                        success: 1,
                        file: {
                          url: data.url,
                        },
                      };
                    } catch (error) {
                      console.error("EditorJS image upload failed:", error);
                      return {
                        success: 0,
                      };
                    }
                  },
                  async uploadByUrl(url: string) {
                    return {
                      success: 1,
                      file: {
                        url: url,
                      },
                    };
                  }
                }
              },
            },
            youtubeEmbed: {
              class: CustomYouTubeEmbed,
              config: {
                placeholder: "Enter YouTube video link",
              },
            },
            marker: {
              class: Marker.default || Marker,
              shortcut: "CMD+SHIFT+M",
            },
            warning: {
              class: Warning.default || Warning,
              config: {
                titlePlaceholder: "Title",
                messagePlaceholder: "Message",
              },
            },
            checklist: {
              class: Checklist.default || Checklist,
              inlineToolbar: true,
            },
            delimiter: Delimiter.default || Delimiter,
          },
          onChange: async (api) => {
            const data = await api.saver.save();
            onChange(data);
          },
          onReady: () => {
            setIsReady(true);
            if (typeof DragDrop.default === 'function') {
              new DragDrop.default(editor);
            } else if (typeof DragDrop === 'function') {
              new DragDrop(editor);
            }
          },
          autofocus: true,
        });

        if (!editorRef.current) {
          editorRef.current = editor;
        } else {
          // If for some reason it already exists, destroy the new one
          editor.destroy();
        }
      });
    }

    return () => {
      isCurrent = false;
      if (editorRef.current && typeof editorRef.current.destroy === 'function') {
        try {
          editorRef.current.destroy();
        } catch (e) {
          console.error("EditorJS cleanup error", e);
        }
        editorRef.current = null;
      } else if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []); // Run only once

  return (
    <div className="w-full h-full p-8 max-w-6xl mx-auto pb-32">
      <div
        id="editorjs-instance"
        ref={containerRef}
        className="prose prose-invert prose-lg max-w-none focus:outline-none h-full  editor-instance"
      />
      <style>
        {`
          #editorjs-instance {
            color: #e5e7eb;
            caret-color: #ffffff;
          }

          #editorjs-instance h1 { font-size: 2.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #ffffff; }
          #editorjs-instance h2 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #f3f4f6; }
          #editorjs-instance h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #e5e7eb; }
          #editorjs-instance h4 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #d1d5db; }

          /* Selection */
          #editorjs-instance ::selection {
            background-color: rgba(255, 255, 255, 0.15);
          }

          /* Global Editor.js UI (appended to body) */
          .ce-toolbar__plus, .ce-toolbar__settings-btn {
            background-color: #1a1a1a !important;
            color: #9ca3af !important;
            border-radius: 8px !important;
          }
          .ce-toolbar__plus:hover, .ce-toolbar__settings-btn:hover {
            background-color: #262626 !important;
            color: #ffffff !important;
          }

          .ce-popover__container {
            background-color: #0f0f0f !important;
          }
          
          .cdx-search-field, .ce-popover__search {
            padding: 4px 6px !important;
          }
          .ce-popover {
            background-color: #0f0f0f !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
            overflow: hidden !important;
            z-index: 1000 !important;
          }

          .cdx-search-field {
            background-color: #1a1a1a !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            padding: 10px !important;
            display: flex !important;
            align-items: center !important;
          }

          .cdx-search-field__icon {
            color: #9ca3af !important;
            margin-right: 8px !important;
            display: flex !important;
            align-items: center !important;
          }

          .cdx-search-field__icon svg {
            width: 16px !important;
            height: 16px !important;
          }

          .cdx-search-field__input {
            background-color: transparent !important;
            border: none !important;
            color: #ffffff !important;
            font-size: 0.9rem !important;
            width: 100% !important;
            outline: none !important;
          }

          .ce-popover__items {
            padding: 6px !important;
            max-height: 350px !important;
            overflow-y: auto !important;
          }

          .ce-popover-item {
            color: #e5e7eb !important;
          }

          .ce-popover-item__icon {
            background-color: #1a1a1a !important;
            color: #ffffff !important;
            box-shadow: none !important;
          }

          .ce-popover-item:hover:not(.ce-popover-item--disabled) {
            background-color: #1a1a1a !important;
          }

          .ce-popover-item--disabled {
            opacity: 0.3 !important;
          }

          .ce-popover-item__title {
            color: inherit !important;
          }

          .ce-popover__nothing-found-message {
            color: #4b5563 !important;
            padding: 1rem !important;
            text-align: center !important;
            font-size: 0.85rem !important;
          }

          /* Inline Toolbar */
          .ce-inline-toolbar {
            background-color: #0f0f0f !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            color: #ffffff !important;
          }
          .ce-inline-tool {
            color: #9ca3af !important;
          }
          .ce-inline-tool:hover {
            background-color: #1a1a1a !important;
            color: #ffffff !important;
          }

          /* Blocks */
          .ce-block--selected .ce-block__content {
            background-color: rgba(255, 255, 255, 0.03) !important;
          }

          /* Code block */
          .ce-code__textarea {
            background-color: #0f0f0f !important;
            color: #6ee7b7 !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-size: 0.9rem !important;
            padding: 1rem !important;
            border-radius: 8px !important;
          }

          /* Quote */
          .cdx-quote {
            border-left: 3px solid #3b82f6 !important;
            padding-left: 1.5rem !important;
            margin: 1.5rem 0 !important;
            font-style: italic !important;
            color: #9ca3af !important;
          }
          .cdx-quote__text {
            font-size: 1.1rem !important;
            line-height: 1.6 !important;
          }
          .cdx-quote__caption {
            color: #4b5563 !important;
            font-style: normal !important;
            margin-top: 0.5rem !important;
          }

          /* Table */
          .tc-table {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          .tc-row::after {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          .tc-cell {
            background-color: transparent !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: #e5e7eb !important;
          }
          .tc-add-column, .tc-add-row {
             color: #4b5563 !important;
          }
          .tc-add-row:hover:before {
             background-color: gray !important;
             color: white !important;
          }
          .tc-add-column:hover, .tc-add-row:hover {
             background-color: rgba(255, 255, 255, 0.05) !important;
             color: #ffffff !important;
          }
          .tc-popover {
            background-color: #0f0f0f !important;
          }

          .tc-popover__item-icon {
            background-color: transparent !important;
            border-radius: 100% !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }

          /* Warning */
          .cdx-warning {
            position: relative;
            background-color: rgba(255, 183, 77, 0.05) !important;
            border: 1px solid rgba(255, 183, 77, 0.1) !important;
            border-left: 4px solid #fbbf24 !important;
            border-radius: 4px 12px 12px 4px !important;
            padding: 1.25rem 1.5rem !important;
            margin: 1.5rem 0 !important;
          }
          .cdx-warning::before {
            content: "!";
            position: absolute;
            left: -12px;
            top: 50%;
            transform: translateY(-50%);
            background: #fbbf24;
            color: #000;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
          }
          .cdx-warning__title {
            color: #fbbf24 !important;
            font-weight: 700 !important;
            font-size: 0.95rem !important;
            letter-spacing: 0.025em !important;
            text-transform: uppercase !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
            border: 0px !important;
          }
          .cdx-warning__message {
            color: #fcd34d !important;
            font-size: 0.95rem !important;
            line-height: 1.6 !important;
            border: none !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            outline: none !important;
            opacity: 0.9;
          }
          .cdx-checklist__item-checkbox-check {
            background-color: #212121;
            color: #3b82f6 !important;
          }
          /* Fix for when placeholder is visible */
          .cdx-warning__title[data-placeholder]:empty:before,
          .cdx-warning__message[data-placeholder]:empty:before {
            color: rgba(251, 191, 36, 0.4) !important;
          }
          /* Delimiter */
          .ce-delimiter {
            line-height: 2rem !important;
            color: rgba(255, 255, 255, 0.2) !important;
          }
          .ce-delimiter:before {
            content: "***" !important;
            font-size: 2rem !important;
          }
          .cdx-block {
            padding: 1rem 0 !important;
          }
          /* Inline Code */
          code {
            background-color: rgba(255, 255, 255, 0.08) !important;
            color: #ef4444 !important;
            padding: 0.15rem 0.35rem !important;
            border-radius: 4px !important;
            font-size: 0.85em !important;
          }
          
          .tc-add-column svg {
            background-color: transparent !important;
            color: #ffffff !important;
          }

          /* Mark */
          mark {
            background-color: rgba(59, 130, 246, 0.2) !important;
            color: #60a5fa !important;
            padding: 0.1rem 0.2rem !important;
            border-radius: 2px !important;
          }

          /* Placeholder */
          .ce-paragraph[data-placeholder]:empty:before {
            color: #4b5563 !important;
          }
        `}
      </style>
    </div>
  );
}

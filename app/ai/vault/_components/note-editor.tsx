"use client";
// @ts-nocheck

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/utils";

interface NoteEditorProps {
  initialData?: any;
  onChange: (data: any) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function NoteEditor({ initialData, onChange, readOnly = false, compact = false }: NoteEditorProps) {
  const editorRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragDropRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
        import('@editorjs/image'),
        import('@editorjs/link'),
        import('editorjs-undo'),
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
        DragDrop,
        ImageTool,
        LinkTool,
        Undo
      ]) => {
        if (!isCurrent) return;

        // Custom YouTube wrapper logic from reference
        class CustomYouTubeEmbed {
          youTubeEmbed: any;
          constructor({ data, config, api, readOnly }: any) {
            this.youTubeEmbed = new YouTubeEmbed.default({ data, config, api, readOnly });
          }
          static get isReadOnlySupported() {
            return true;
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

        class CustomCodeBlock {
          api: any;
          readOnly: boolean;
          isExpanded: boolean;
          data: any;
          wrapper: HTMLElement;
          textarea: HTMLTextAreaElement;
          gutter: HTMLElement;

          constructor({ data, api, readOnly }: any) {
            this.api = api;
            this.readOnly = readOnly;
            this.isExpanded = false;
            this.data = {
              code: data.code || '',
              language: data.language || 'javascript',
            };
            this.wrapper = document.createElement('div');
            this.textarea = document.createElement('textarea');
            this.gutter = document.createElement('div');
          }

          static get isReadOnlySupported() {
            return true;
          }

          static get toolbox() {
            return {
              icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.8824 10.6098L1 7.00004L4.8824 3.39026M9.1176 10.6098L13 7.00004L9.1176 3.39026" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
              title: 'Code',
            };
          }

          render() {
            this.wrapper.classList.add('custom-code-block');
            
            const header = document.createElement('div');
            header.classList.add('custom-code-block__header');
            
            const dots = document.createElement('div');
            dots.classList.add('custom-code-block__dots');
            dots.innerHTML = '<span></span><span></span><span></span>';
            


            const copyBtn = document.createElement('button');
            copyBtn.classList.add('custom-code-block__copy');
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            copyBtn.addEventListener('click', () => {
              navigator.clipboard.writeText(this.textarea.value || this.data.code);
              copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
              setTimeout(() => {
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
              }, 2000);
            });

            header.appendChild(dots);
            header.appendChild(copyBtn);

            const body = document.createElement('div');
            body.classList.add('custom-code-block__body');
            body.style.position = 'relative';

            this.gutter.classList.add('custom-code-block__gutter');
            
            const codeContainer = document.createElement('div');
            codeContainer.classList.add('custom-code-block__code-container');
            
            const highlightPre = document.createElement('pre');
            highlightPre.classList.add('custom-code-block__highlight');
            highlightPre.setAttribute('aria-hidden', 'true');
            
            this.textarea.classList.add('custom-code-block__textarea');
            this.textarea.value = this.data.code;
            this.textarea.placeholder = 'Write your code here...';
            this.textarea.spellcheck = false;
            
            if (this.readOnly) {
              this.textarea.readOnly = true;
              this.textarea.classList.add('read-only');
            }
            
            codeContainer.appendChild(highlightPre);
            codeContainer.appendChild(this.textarea);
            
            const simpleHighlight = (code: string) => {
              if (!code) return '';
              let html = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              
              // Strings (non-backtracking)
              html = html.replace(/(&quot;[^&]*?&quot;|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)/g, '<span style="color: #a6e22e;">$1</span>');
              // Comments (line and block comments optimized)
              html = html.replace(/(\/\/.*|#.*)/g, '<span style="color: #6272a4;">$1</span>');
              html = html.replace(/\/\*[\s\S]*?\*\//g, '<span style="color: #6272a4;">$&</span>');
              // Keywords
              const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'def', 'self', 'True', 'False', 'None', 'public', 'private', 'protected', 'interface', 'type', 'implements', 'extends', 'new', 'this'];
              const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
              html = html.replace(keywordRegex, '<span style="color: #ff79c6;">$1</span>');
              // Methods/Functions
              html = html.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span style="color: #50fa7b;">$1</span>');
              // Numbers
              html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color: #bd93f9;">$1</span>');
              // Booleans/Null
              html = html.replace(/\b(true|false|null|undefined)\b/g, '<span style="color: #bd93f9;">$1</span>');
              
              return html;
            };

            const expandOverlay = document.createElement('div');
            expandOverlay.classList.add('custom-code-block__expand-overlay');
            const expandBtn = document.createElement('button');
            expandBtn.textContent = 'Expand Code';
            expandBtn.classList.add('custom-code-block__expand-btn');
            expandOverlay.appendChild(expandBtn);

            expandBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.isExpanded = true;
              updateExpandState();
            });

            let initiallyChecked = false;

            const updateExpandState = () => {
              const linesCount = (this.textarea.value.match(/\n/g) || []).length + 1;
              if (!initiallyChecked) {
                initiallyChecked = true;
                if (linesCount <= 100) {
                  this.isExpanded = true;
                }
              }

              if (!this.isExpanded && linesCount > 100) {
                body.classList.add('collapsed');
              } else {
                body.classList.remove('collapsed');
              }
            };

            const updateGutter = () => {
              const linesCount = (this.textarea.value.match(/\n/g) || []).length + 1;
              this.gutter.innerHTML = Array.from({ length: linesCount }, (_, i) => `<div>${i + 1}</div>`).join('');
              highlightPre.innerHTML = simpleHighlight(this.textarea.value) + (this.textarea.value.endsWith('\n') ? ' ' : '');
              updateExpandState();
            };

            const adjustHeight = () => {
              this.textarea.style.height = 'auto';
              this.textarea.style.height = this.textarea.scrollHeight + 'px';
              highlightPre.style.height = this.textarea.scrollHeight + 'px';
            };

            this.textarea.addEventListener('input', () => {
              updateGutter();
              adjustHeight();
            });

            this.textarea.addEventListener('scroll', () => {
              highlightPre.scrollTop = this.textarea.scrollTop;
              highlightPre.scrollLeft = this.textarea.scrollLeft;
            });

            // Need to wait for DOM insertion to calculate height properly
            setTimeout(() => {
              updateGutter();
              adjustHeight();
            }, 0);

            body.appendChild(this.gutter);
            body.appendChild(codeContainer);
            body.appendChild(expandOverlay);

            this.wrapper.appendChild(header);
            this.wrapper.appendChild(body);

            return this.wrapper;
          }

          save() {
            return {
              code: this.textarea.value,
              language: this.data.language,
            };
          }
        }

        let parsedData = undefined;
        if (typeof initialData === 'string' && initialData.trim() !== '') {
          // Check if it's stringified JSON
          if (initialData.trim().startsWith('{') || initialData.trim().startsWith('[')) {
            try {
              let parsed = JSON.parse(initialData);
              if (Array.isArray(parsed)) {
                parsedData = {
                  time: Date.now(),
                  blocks: parsed,
                  version: '2.28.2'
                };
              } else {
                parsedData = parsed;
              }
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
          if (Array.isArray(initialData)) {
            parsedData = {
              time: Date.now(),
              blocks: initialData,
              version: '2.28.2'
            };
          } else {
            parsedData = initialData;
          }
        }

        // Sanitize data before passing to EditorJS to prevent plugin crashes
        if (parsedData && Array.isArray(parsedData.blocks)) {
          parsedData.blocks = parsedData.blocks.map((block: any) => {
            if (block.type === 'list' && block.data && Array.isArray(block.data.items)) {
              block.data.items = block.data.items.map((item: any) => {
                if (typeof item === 'string') {
                  return { content: item, items: [] };
                } else if (item && typeof item === 'object') {
                  return {
                    content: item.content || item.text || '',
                    items: Array.isArray(item.items) ? item.items : []
                  };
                }
                return { content: '', items: [] };
              });
            }
            return block;
          });
        }

        import('@editorjs/editorjs').then((EditorJSModule) => {
          if (!isCurrent) return;
          const EditorJS = EditorJSModule.default || EditorJSModule;

          const editor = new EditorJS({
            holder: containerRef.current!,
            data: parsedData,
            placeholder: 'Start writing your content...',
            readOnly: readOnly,
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
              code: CustomCodeBlock,
              quote: {
                class: Quote.default || Quote,
                inlineToolbar: true,
              },
              table: {
                class: Table.default || Table,
                inlineToolbar: true,
              },
              inlineCode: InlineCode.default || InlineCode,
              image: {
                class: ImageTool.default || ImageTool,
                config: {
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
                }
              },
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
              linkTool: {
                class: LinkTool.default || LinkTool,
                config: {
                  endpoint: "/api/fetchUrl", // Your endpoint that provides URL metadata
                },
              },
            },
            onChange: async (api) => {
              const data = await api.saver.save();
              onChangeRef.current(data);
            },
            onReady: () => {
              setIsReady(true);
              try {
                const UndoConstructor = Undo.default || Undo;
                const undoInstance = new UndoConstructor({ editor });
                
                // Initialize undo stack with the parsed initial data to prevent
                // "can't access property 'data', t[n] is undefined" crash when undoing.
                if (parsedData && parsedData.blocks && parsedData.blocks.length > 0) {
                  undoInstance.initialize(parsedData);
                }
              } catch (e) {
                console.error("Failed to initialize EditorJS Undo plugin:", e);
              }
              try {
                let dragDropInstance;
                if (typeof DragDrop.default === 'function') {
                  dragDropInstance = new DragDrop.default(editor);
                } else if (typeof DragDrop === 'function') {
                  dragDropInstance = new DragDrop(editor);
                }
                dragDropRef.current = dragDropInstance;
              } catch (e) {
                console.error("Failed to initialize EditorJS DragDrop plugin:", e);
              }
            },
          });

          if (!editorRef.current) {
            editorRef.current = editor as any;
          } else {
            // If for some reason it already exists, destroy the new one
            editor.destroy();
          }
        });
      });
    }

    return () => {
      isCurrent = false;
      if (editorRef.current && typeof editorRef.current.destroy === 'function') {
        try {
          // Dispatch custom destroy event so editorjs-undo cleans up its DOM listeners
          if (containerRef.current) {
            containerRef.current.dispatchEvent(new CustomEvent("destroy"));
          }
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

  useEffect(() => {
    if (editorRef.current && isReady) {
      try {
        editorRef.current.readOnly.toggle(readOnly);
        if (dragDropRef.current) {
          dragDropRef.current.readOnly = readOnly;
          if (!readOnly) {
            // Re-run drag listener creation if we just switched to editable
            dragDropRef.current.setDragListener();
          }
        }
      } catch (e) {
        console.error("Failed to toggle readOnly state", e);
      }
    }
  }, [readOnly, isReady]);

  return (
    <div className={compact ? "w-full h-full min-h-[150px]" : "w-full h-full p-8 max-w-6xl mx-auto pb-32"}>
      <div
        id="editorjs-instance"
        ref={containerRef}
        className="prose prose-invert prose-lg max-w-none focus:outline-none h-full  editor-instance"
      />
      <style>
        {`
          #editorjs-instance {
            color: #a0a0a5;
            caret-color: #ffffff;
          }

          #editorjs-instance h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1.50rem; color: #d4d4d8; }
          #editorjs-instance h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 1.0rem; color: #c4c4c7; }
          #editorjs-instance h3 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; color: #a8a8ab; }
          #editorjs-instance h4 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.50rem; color: #8e8e93; }

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
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          
          .cdx-search-field, .ce-popover__search {
            padding: 4px 6px !important;
            min-height: 34px;
          }
          .ce-popover {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
            overflow: hidden !important;
            z-index: 1000 !important;
          }
            
          .ce-popover--opened {
            width: 230px;
            height: 450px;
          }

          .ce-toolbar__actions--opened {
            left: -120px !important;
          }

          .cdx-input {
            border: 1px solid #505050 !important;
          }

          .inline-image__picture--withBackground {
            background: #222223;
            border: none !important;
            border-radius: 10px
          }

          .cdx-search-field {
            background-color: #1a1a1a !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            padding: 0px !important;
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
            color: #ffffff !important;
            box-shadow: none !important;
          }

          .ce-popover-item:hover:not(.ce-popover-item--disabled) {
            background-color: transparent !important;
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
            border-radius: 8px !important;
            color: #ffffff !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
            z-index: 1000 !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          .ce-inline-toolbar__actions {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 4px !important;
          }
          .ce-inline-tool {
            color: #9ca3af !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 28px !important;
            height: 28px !important;
            border-radius: 6px !important;
            transition: all 0.2s ease !important;
          }
          .ce-inline-tool:hover {
            background-color: #1a1a1a !important;
            color: #ffffff !important;
          }
          .ce-inline-tool svg {
            width: 24px !important;
            height: 24px !important;
          }
          .ce-inline-toolbar__dropdown {
            color: #9ca3af !important;
            height: 28px !important;
            padding: 0 8px !important;
            margin-right: 4px !important;
            border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
            display: flex !important;
            align-items: center !important;
            font-size: 0.85rem !important;
          }
          .ce-inline-toolbar__dropdown:hover {
            background-color: #1a1a1a !important;
            color: #ffffff !important;
            border-radius: 6px 0 0 6px !important;
          }

          /* Blocks */
          .ce-block--selected .ce-block__content {
            background-color: rgba(255, 255, 255, 0.03) !important;
          }

          .ce-block__content {
            max-width: 760px !important;
          }

          /* Custom Code block */
          .custom-code-block {
            background-color: rgba(15, 15, 15, 0.7) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            margin: 1.5rem 0 !important;
            backdrop-filter: blur(10px);
          }
          .custom-code-block__header {
            display: flex !important;
            align-items: center !important;
            padding: 0.75rem 1rem !important;
            background-color: rgba(255, 255, 255, 0.03) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .custom-code-block__dots {
            display: flex !important;
            gap: 6px !important;
            margin-right: 1rem !important;
          }
          .custom-code-block__dots span {
            width: 12px !important;
            height: 12px !important;
            border-radius: 50% !important;
          }
          .custom-code-block__dots span:nth-child(1) { background-color: #ff5f56 !important; }
          .custom-code-block__dots span:nth-child(2) { background-color: #ffbd2e !important; }
          .custom-code-block__dots span:nth-child(3) { background-color: #27c93f !important; }
          
          .custom-code-block__language {
            flex-grow: 1 !important;
            display: flex !important;
            align-items: center !important;
            color: #9ca3af !important;
            font-size: 0.8rem !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-weight: 500 !important;
            letter-spacing: 0.05em !important;
          }
          .custom-code-block__language select {
            background: transparent !important;
            color: #9ca3af !important;
            border: none !important;
            outline: none !important;
            font-size: 0.8rem !important;
            font-family: inherit !important;
            text-transform: uppercase !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            padding: 0 !important;
          }
          .custom-code-block__language select option {
            background-color: #1a1a1a !important;
            color: #ffffff !important;
          }
          
          .custom-code-block__copy {
            background: transparent !important;
            border: none !important;
            color: #6b7280 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 4px !important;
            border-radius: 6px !important;
            transition: all 0.2s ease !important;
            margin-left: auto !important; /* Push to the right */
          }
          .custom-code-block__copy:hover {
            color: #ffffff !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          .custom-code-block__body {
            display: flex !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-size: 0.9rem !important;
            line-height: 1.5 !important;
          }
          .custom-code-block__gutter {
            padding: 1rem 0.5rem 1rem 0.5rem !important;
            text-align: right !important;
            color: #4b5563 !important;
            user-select: none !important;
            border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
            background-color: rgba(0, 0, 0, 0.2) !important;
            min-width: 3rem !important;

            div {
              // font-size: 14px;
             }
          }
          .custom-code-block__code-container {
            position: relative !important;
            flex-grow: 1 !important;
            overflow: hidden !important;
          }
          .custom-code-block__highlight, .custom-code-block__textarea {
            margin: 0 !important;
            padding: 1rem 1rem 1.5rem 1rem !important; /* Extra bottom padding for scrollbar */
            border: none !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-size: 0.9rem !important;
            line-height: 1.5 !important;
            white-space: pre !important;
            tab-size: 2 !important;
            width: 100% !important;
            word-wrap: normal !important;
          }
          .custom-code-block__highlight {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            color: #f8f8f2 !important;
            background: transparent !important;
            pointer-events: none !important;
            overflow: hidden !important;
          }
          .custom-code-block__textarea {
            position: relative !important;
            color: transparent !important;
            caret-color: #f8f8f2 !important;
            background: transparent !important;
            resize: none !important;
            outline: none !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
          }
          .custom-code-block__textarea::placeholder {
            color: #4b5563 !important;
          }
          /* Collapsed state rules */
          .custom-code-block__body.collapsed {
            max-height: 400px !important;
            overflow: hidden !important;
          }
          .custom-code-block__body.collapsed .custom-code-block__expand-overlay {
            display: flex !important;
          }
          .custom-code-block__expand-overlay {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 120px !important;
            background: linear-gradient(transparent, rgba(15, 15, 15, 0.98) 70%) !important;
            display: none; /* hidden by default */
            align-items: flex-end !important;
            justify-content: center !important;
            padding-bottom: 1.5rem !important;
            z-index: 10 !important;
            pointer-events: none !important;
          }
          .custom-code-block__expand-btn {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            padding: 0.5rem 1.25rem !important;
            border-radius: 20px !important;
            font-size: 0.85rem !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            pointer-events: auto !important;
            backdrop-filter: blur(4px) !important;
            transition: background-color 0.2s !important;
            font-family: inherit !important;
          }
          .custom-code-block__expand-btn:hover {
            background-color: rgba(255, 255, 255, 0.2) !important;
          }
          
          /* Hide old code block styles if any remain */
          .ce-code__textarea { display: none !important; }

          /* Quote */
          .cdx-quote {
            border-left: 3px solid rgba(255, 255, 255, 0.1) !important;
            padding-left: 1.5rem !important;
            margin: 1.5rem 0 !important;
            font-style: italic !important;
            color: #9ca3af !important;
          }
          .cdx-quote__text {
            font-size: 1.1rem !important;
            line-height: 1.6 !important;
            border-radius: 0px !important;
          }
          .cdx-quote__caption {
            color: #4b5563 !important;
            font-style: normal !important;
            margin-top: 0.5rem !important;
            border-radius: 0px !important;
          }

          /* Table */
          .tc-table {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          .tc-row {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          .tc-row::after {
            border-color: rgba(255, 255, 255, 0.1) !important;
          }
          .tc-cell {
            border-left: 1px solid #050505;
            background-color: transparent !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: #e5e7eb !important;
          }
          .tc-add-column, .tc-add-row {
            border-color: rgba(255, 255, 255, 0.1) !important;
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

          .image-tool__caption {
            bottom: -36px !important;
          }

          .inline-image__caption {
            border-color: rgba(255, 255, 255, 0.1) !important;
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
            box-shadow: none;
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
            border-color: rgba(255, 255, 255, 0.1) !important;
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
            padding: 0rem 0 !important;
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

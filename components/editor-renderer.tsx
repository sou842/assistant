import React from 'react';

type EditorBlock = {
  id: string;
  type: string;
  data: any;
};

export function EditorRenderer({ content }: { content: { blocks: EditorBlock[] } }) {
  if (!content || !content.blocks) return null;

  return (
    <div className="editor-content">
      {content.blocks.map((block) => {
        switch (block.type) {
          case 'header':
            const Tag = `h${block.data.level || 2}` as keyof JSX.IntrinsicElements;
            return <Tag key={block.id} className="font-bold my-4" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
          case 'paragraph':
            return <p key={block.id} className="my-2" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
          case 'list':
            const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
            const renderListItems = (items: any[]): React.ReactNode => {
              return items.map((item: any, i: number) => {
                const content = typeof item === 'string' ? item : item.content;
                const nestedItems = item && typeof item === 'object' && Array.isArray(item.items) ? item.items : [];
                return (
                  <li key={i}>
                    <span dangerouslySetInnerHTML={{ __html: content }} />
                    {nestedItems.length > 0 && (
                      <ListTag className={`${block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'} pl-5 mt-1`}>
                        {renderListItems(nestedItems)}
                      </ListTag>
                    )}
                  </li>
                );
              });
            };
            return (
              <ListTag key={block.id} className={`my-4 ${block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'} pl-5`}>
                {renderListItems(block.data.items)}
              </ListTag>
            );
          case 'delimiter':
            return <hr key={block.id} className="my-8 border-t-2 border-border" />;
          case 'image':
            return (
              <div key={block.id} className="my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.data.file.url} alt={block.data.caption || 'Image'} className="rounded-lg max-w-full h-auto" />
                {block.data.caption && <p className="text-sm text-center text-muted-foreground mt-2">{block.data.caption}</p>}
              </div>
            );
          case 'quote':
            return (
              <blockquote key={block.id} className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                <div dangerouslySetInnerHTML={{ __html: block.data.text }} />
                {block.data.caption && <footer className="text-sm mt-2 font-semibold">— {block.data.caption}</footer>}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={block.id} className="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono">
                <code>{block.data.code}</code>
              </pre>
            );
          case 'checklist':
            return (
              <div key={block.id} className="my-4 space-y-2">
                {block.data.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!item.checked}
                      readOnly
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span
                      className={item.checked ? "line-through text-muted-foreground" : ""}
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  </div>
                ))}
              </div>
            );
          default:
            console.warn(`Unknown block type: ${block.type}`);
            return null;
        }
      })}
    </div>
  );
}

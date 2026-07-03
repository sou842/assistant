import { FileText, Table, Image, FolderHeart, ExternalLink, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface VaultCardProps {
  data: {
    success: boolean;
    item?: {
      _id: string;
      title: string;
      type: string;
      tags?: string[];
    };
    error?: string;
  };
  action: "create" | "update";
}

export function VaultCard({ data, action }: VaultCardProps) {
  const router = useRouter();

  if (!data.success || !data.item) {
    return null;
  }

  const { _id, title, type, tags } = data.item;

  const Icon = type === "spreadsheet" ? Table :
    type === "gallery" ? Image :
      type === "album" ? NotebookPen : FileText;

  const typeLabel = type === "spreadsheet" ? "Spreadsheet" :
    type === "gallery" ? "Gallery" :
      type === "album" ? "Album" : "Note";

  const actionLabel = action === "create" ? "Created" : "Updated";

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-app-border-subtle bg-app-surface-glass p-4 sm:max-w-md w-full shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="truncate text-sm font-semibold text-app-text-primary">
            {title || `Untitled ${typeLabel}`}
          </h4>
          <p className="text-xs text-app-text-muted">
            {typeLabel} • {actionLabel}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/ai/vault/${_id}`);
          }}
          className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-app-text-secondary transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <span>Open</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-app-surface px-2 py-1 text-xs font-medium text-app-text-muted ring-1 ring-inset ring-app-border-subtle"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

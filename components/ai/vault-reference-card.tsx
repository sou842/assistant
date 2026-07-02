import { FileText, Table, Image, FolderHeart } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useMemo } from "react";

interface VaultReferenceCardProps {
  id: string;
  title: string;
  type: string;
}

export const VaultReferenceCard = memo(function VaultReferenceCard({ id, title, type }: VaultReferenceCardProps) {
  const router = useRouter();

  const { Icon, typeLabel, iconBgClass } = useMemo(() => {
    switch (type) {
      case "spreadsheet":
        return { Icon: Table, typeLabel: "Spreadsheet", iconBgClass: "bg-[#0F9D58]" };
      case "gallery":
        return { Icon: Image, typeLabel: "Gallery", iconBgClass: "bg-[#A142F4]" };
      case "album":
        return { Icon: FolderHeart, typeLabel: "Album", iconBgClass: "bg-[#A142F4]" };
      default:
        return { Icon: FileText, typeLabel: "Note", iconBgClass: "bg-[#4285F4]" };
    }
  }, [type]);

  if (!id) {
    return null;
  }

  return (
    <div
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set("vaultItem", id);
        router.push(url.pathname + url.search);
      }}
      className="mt-4 flex w-fit min-w-[220px] cursor-pointer items-center gap-3 rounded-xl bg-app-surface-glass p-2 pr-3 shadow-sm transition-all hover:bg-white/5 active:scale-95"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBgClass} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="truncate text-xs font-medium text-app-text-primary">
          {title || `Untitled ${typeLabel}`}
        </span>
        <span className="text-xs text-app-text-muted">
          {typeLabel}
        </span>
      </div>
    </div>
  );
});

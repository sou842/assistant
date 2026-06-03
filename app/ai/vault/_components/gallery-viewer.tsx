"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Image as ImageIcon,
  FileText,
  Film,
  Download,
  Trash2,
  ExternalLink,
  X,
  Calendar,
  HardDrive,
  FileArchive,
  Music,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface MediaFile {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  mediaType: string;
  size: number;
  createdAt: string | Date;
}

interface GalleryViewerProps {
  initialData: MediaFile[];
  onChange: (newData: MediaFile[]) => void;
}

const formatBytes = (bytes: any, decimals = 1) => {
  if (typeof bytes === "string") return bytes;
  if (!bytes || isNaN(Number(bytes))) return "0 Bytes";
  const numBytes = Number(bytes);
  if (numBytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export function GalleryViewer({ initialData = [], onChange }: GalleryViewerProps) {
  const params = useParams();
  const id = params.id as string;

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "images" | "documents" | "other">("all");
  const [lightboxFile, setLightboxFile] = useState<MediaFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const categorizedFiles = useMemo(() => {
    const list = Array.isArray(initialData) ? initialData : [];
    return list.map((file) => {
      const type = file.mediaType?.toLowerCase() || "";
      let category: "images" | "documents" | "other" = "other";

      if (type.startsWith("image/") || type === "image" || file.filename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
        category = "images";
      } else if (
        type.startsWith("text/") ||
        type.includes("pdf") ||
        type.includes("sheet") ||
        type.includes("document") ||
        type.includes("excel") ||
        type.includes("word") ||
        type.includes("powerpoint") ||
        file.filename.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i)
      ) {
        category = "documents";
      }

      return {
        ...file,
        category,
      };
    });
  }, [initialData]);

  const filteredFiles = useMemo(() => {
    return categorizedFiles.filter((file) => {
      const matchesSearch = file.filename.toLowerCase().includes(query.toLowerCase());
      const matchesTab = activeTab === "all" || file.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [categorizedFiles, query, activeTab]);

  const stats = useMemo(() => {
    const totalSize = categorizedFiles.reduce((acc, file) => acc + (file.size || 0), 0);
    return {
      totalCount: categorizedFiles.length,
      totalSizeStr: formatBytes(totalSize),
    };
  }, [categorizedFiles]);

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to permanently delete this file?")) return;

    setIsDeleting(fileId);
    try {
      const updatedList = initialData.filter((file) => file.id !== fileId);

      const res = await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: updatedList }),
      });

      if (res.ok) {
        toast.success("File deleted successfully");
        onChange(updatedList);
      } else {
        toast.error("Failed to delete file");
      }
    } catch (err) {
      toast.error("An error occurred during deletion");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    try {
      toast.success(`Starting download for "${filename}"...`);
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download file:", err);
      window.open(url, "_blank");
    }
  };

  const getFileIcon = (mediaType: string) => {
    const type = mediaType.toLowerCase();
    if (type.startsWith("image/")) return <ImageIcon className="size-8 text-blue-400" />;
    if (type.startsWith("video/")) return <Film className="size-8 text-red-400" />;
    if (type.startsWith("audio/")) return <Music className="size-8 text-emerald-400" />;
    if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return <FileArchive className="size-8 text-amber-400" />;
    return <FileText className="size-8 text-purple-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#070707] text-app-text-primary">

      {/* FILTER & STATS BAR */}
      <div className="p-6 border-b border-app-border-subtle bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 bg-app-canvas/40 p-1 rounded-full border border-app-border-subtle w-fit">
          {(["all", "images", "documents", "other"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer capitalize ${activeTab === tab
                ? "bg-app-surface-glass-strong text-app-text-primary shadow-md"
                : "text-app-text-muted hover:text-app-text-primary"
                }`}
            >
              {tab === "all" ? "All Files" : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-md md:justify-end">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-app-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in Gallery..."
              className="h-9 w-full rounded-full border border-app-border-subtle bg-app-canvas/35 pl-9.5 pr-4 text-xs outline-none focus:border-white/15 transition-all text-app-text-secondary placeholder:text-app-text-faint"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 text-white/45 text-xs bg-white/[0.03] py-2 px-3.5 border border-app-border-subtle rounded-full">
            <HardDrive size={13} className="text-app-text-soft" />
            <span>{stats.totalCount} files ({stats.totalSizeStr})</span>
          </div>
        </div>
      </div>

      {/* PINTEREST GALLERY CONTAINER */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredFiles.length === 0 ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="size-14 rounded-2xl bg-white/[0.03] border border-app-border-subtle flex items-center justify-center mb-4">
              <ImageIcon className="size-6 text-white/25" />
            </div>
            <h3 className="font-semibold text-app-text-soft">No assets found</h3>
            <p className="text-xs text-app-text-muted max-w-xs mt-1.5 leading-normal">
              {query ? "Try checking spelling or adjusting the query filters." : "Attach files inside notes or chats to populate your Vault Gallery."}
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-5 space-y-5 [column-fill:_balance]">
            {filteredFiles.map((file) => {
              const isImage = file.category === "images";
              const parsedDate = file.createdAt ? new Date(file.createdAt) : new Date();
              const isValidDate = !isNaN(parsedDate.getTime());
              const formattedDate = format(isValidDate ? parsedDate : new Date(), "MMM d, yyyy");
              const fileSizeStr = formatBytes(file.size);

              return (
                <div
                  key={file.id}
                  className="break-inside-avoid relative inline-flex flex-col w-full rounded-2xl border border-app-border-subtle bg-app-canvas/20 hover:border-white/20 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl group cursor-pointer"
                >
                  {/* ASSET ELEMENT DISPLAY CONTAINER */}
                  <div className="relative w-full overflow-hidden bg-app-canvas/10">
                    {isImage && !failedImages[file.id] ? (
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-auto object-cover block transition-transform duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                        onError={() => {
                          setFailedImages((prev) => ({ ...prev, [file.id]: true }));
                        }}
                      />
                    ) : (
                      /* Minimalist fallbacks for docs/videos/audio */
                      <div className="w-full min-h-[180px] py-12 bg-gradient-to-br from-white/[0.01] to-white/[0.04] flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-[1.02]">
                        <div className="size-14 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-md backdrop-blur-sm mb-2 text-app-text-primary">
                          {isImage ? <ImageIcon className="size-6 text-purple-400/80" /> : getFileIcon(file.mediaType)}
                        </div>
                        <span className="text-[11px] text-app-text-muted max-w-[80%] truncate text-center opacity-80 group-hover:opacity-0 transition-opacity duration-200">
                          {file.filename}
                        </span>
                      </div>
                    )}

                    {/* TOP BADGE (Always visible or cleanly accented) */}
                    <div className="absolute top-3 left-3 z-30 pointer-events-none">
                      <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 font-mono uppercase text-[9px] text-white/90 tracking-wider">
                        {file.mediaType.split("/")[1] || "unknown"}
                      </span>
                    </div>

                    {/* INTERACTIVE FULL-CARD HOVER OVERLAY */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/40 to-black/20 backdrop-blur-[1px]">

                      {/* Top Action Row (Delete) */}
                      <div className="flex justify-end w-full">
                        <button
                          disabled={isDeleting === file.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteFile(file.id);
                          }}
                          className="p-1.5 rounded-full bg-white/10 hover:bg-red-500 text-white/80 hover:text-white border border-white/10 hover:border-red-500 transition-all shadow-md cursor-pointer disabled:opacity-50"
                          title="Delete asset"
                        >
                          <Trash2 size={13} className={isDeleting === file.id ? "animate-pulse" : ""} />
                        </button>
                      </div>

                      {/* Middle Action Row (Center controls) */}
                      <div className="flex items-center justify-center gap-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                        {(!isImage || !failedImages[file.id]) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxFile(file);
                            }}
                            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-xl hover:scale-105 cursor-pointer backdrop-blur-md"
                            title="Quick View"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-xl hover:scale-105 flex items-center justify-center backdrop-blur-md"
                          title="Open Original"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>

                      {/* Bottom Meta Data Context */}
                      <div className="flex flex-col gap-1.5 transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                        {/* <h4 className="font-medium text-xs text-white truncate select-all drop-shadow-md" title={file.filename}>
                          {file.filename}
                        </h4> */}

                        <div className="flex items-center justify-between text-[10px] text-white/70">
                          <div className="flex items-center gap-1 drop-shadow-sm">
                            <Calendar size={11} className="opacity-70" />
                            <span>{formattedDate}</span>
                            <span className="opacity-40">•</span>
                            <span>{fileSizeStr}</span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file.url, file.filename);
                            }}
                            className="flex items-center gap-1 py-1.5 px-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/10 hover:border-white transition-all font-medium cursor-pointer backdrop-blur-sm"
                            title="Download File"
                          >
                            <Download size={10} />
                            {/* <span>Get</span> */}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE LIGHTBOX OVERLAY */}
      {lightboxFile && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-app-canvas/95 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxFile(null)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 size-10 rounded-full bg-app-surface-glass-strong hover:bg-white/20 border border-app-border-default text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
            onClick={() => setLightboxFile(null)}
          >
            <X className="size-5" />
          </button>

          <div className="flex flex-col items-center gap-3 max-w-[95vw] max-h-[90vh]">
            {lightboxFile.mediaType?.startsWith("image/") ? (
              <img
                src={lightboxFile.url}
                alt={lightboxFile.filename}
                className="max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-app-border-subtle animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            ) : lightboxFile.mediaType?.startsWith("video/") ? (
              <video
                src={lightboxFile.url}
                controls
                autoPlay
                className="max-h-[75vh] rounded-2xl shadow-2xl border border-app-border-subtle animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <iframe
                src={lightboxFile.url}
                className="w-[85vw] h-[80vh] rounded-2xl shadow-2xl bg-app-surface-glass border border-app-border-subtle animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className="text-app-text-soft text-xs px-4 py-1.5 rounded-full bg-app-surface-glass border border-app-border-subtle select-all" onClick={(e) => e.stopPropagation()}>
              {lightboxFile.filename} ({formatBytes(lightboxFile.size)})
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
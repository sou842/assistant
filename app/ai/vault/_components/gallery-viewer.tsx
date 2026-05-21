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

// Utility to format raw bytes into human readable KB/MB
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

  // Group files into categories
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

  // Filter & search files
  const filteredFiles = useMemo(() => {
    return categorizedFiles.filter((file) => {
      const matchesSearch = file.filename.toLowerCase().includes(query.toLowerCase());
      const matchesTab = activeTab === "all" || file.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [categorizedFiles, query, activeTab]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalSize = categorizedFiles.reduce((acc, file) => acc + (file.size || 0), 0);
    return {
      totalCount: categorizedFiles.length,
      totalSizeStr: formatBytes(totalSize),
    };
  }, [categorizedFiles]);

  // Direct deletion handler (auto-saves to DB instantly)
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

  // Programmatic CORS-compliant file downloader
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
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  // Helper to choose the best file icon
  const getFileIcon = (mediaType: string) => {
    const type = mediaType.toLowerCase();
    if (type.startsWith("image/")) return <ImageIcon className="size-8 text-blue-400" />;
    if (type.startsWith("video/")) return <Film className="size-8 text-red-400" />;
    if (type.startsWith("audio/")) return <Music className="size-8 text-emerald-400" />;
    if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return <FileArchive className="size-8 text-amber-400" />;
    return <FileText className="size-8 text-purple-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#070707] text-white">
      
      {/* FILTER & STATS BAR */}
      <div className="p-6 border-b border-white/5 bg-white/1 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        
        {/* TABS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-full border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === "all" ? "bg-white/10 text-white shadow-md border border-white/5" : "text-white/40 hover:text-white"
            }`}
          >
            All Files
          </button>
          <button
            onClick={() => setActiveTab("images")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === "images" ? "bg-white/10 text-white shadow-md border border-white/5" : "text-white/40 hover:text-white"
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === "documents" ? "bg-white/10 text-white shadow-md border border-white/5" : "text-white/40 hover:text-white"
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab("other")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === "other" ? "bg-white/10 text-white shadow-md border border-white/5" : "text-white/40 hover:text-white"
            }`}
          >
            Other
          </button>
        </div>

        {/* SEARCH AND STATS */}
        <div className="flex items-center gap-4 flex-1 max-w-md md:justify-end">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in Gallery..."
              className="h-9 w-full rounded-full border border-white/5 bg-black/35 pl-9.5 pr-4 text-xs outline-none focus:border-white/15 transition-all text-white/90 placeholder:text-white/20"
            />
          </div>
          
          <div className="flex items-center gap-2 shrink-0 text-white/45 text-xs bg-white/3 py-2 px-3.5 border border-white/5 rounded-full">
            <HardDrive size={13} className="text-white/60" />
            <span>{stats.totalCount} files ({stats.totalSizeStr})</span>
          </div>
        </div>

      </div>

      {/* GALLERY GRID */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredFiles.length === 0 ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="size-14 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center mb-4">
              <ImageIcon className="size-6 text-white/25" />
            </div>
            <h3 className="font-semibold text-white/70">No assets found</h3>
            <p className="text-xs text-white/30 max-w-xs mt-1.5 leading-normal">
              {query ? "Try checking spelling or adjusting the query filters." : "Attach files in Jarvis Chat or paste images inside notes to populate your Vault Gallery."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredFiles.map((file) => {
              const isImage = file.category === "images";
              const parsedDate = file.createdAt ? new Date(file.createdAt) : new Date();
              const isValidDate = !isNaN(parsedDate.getTime());
              const formattedDate = format(isValidDate ? parsedDate : new Date(), "MMM d, yyyy");
              const fileSizeStr = formatBytes(file.size);

              return (
                <div
                  key={file.id}
                  className="group relative flex flex-col rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-200 overflow-hidden shadow-lg hover:scale-[1.02]"
                >
                  
                  {/* PREVIEW CONTAINER */}
                  <div className="relative aspect-video w-full bg-black/40 overflow-hidden border-b border-white/5 flex items-center justify-center shrink-0">
                    {isImage && !failedImages[file.id] ? (
                      <>
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="size-full object-cover select-none"
                          loading="lazy"
                          onError={() => {
                            setFailedImages(prev => ({ ...prev, [file.id]: true }));
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => setLightboxFile(file)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-md cursor-pointer"
                            title="Quick View"
                          >
                            <Eye size={15} />
                          </button>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-md flex items-center justify-center"
                            title="Open original"
                          >
                            <ExternalLink size={15} />
                          </a>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col items-center gap-2.5">
                          <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                            {isImage ? <ImageIcon className="size-6 text-purple-400/80" /> : getFileIcon(file.mediaType)}
                          </div>
                          {isImage && <span className="text-[10px] text-white/30">Preview Unavailable</span>}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {isImage ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-md flex items-center justify-center"
                              title="Open original"
                            >
                              <ExternalLink size={15} />
                            </a>
                          ) : (
                            <>
                              <button
                                onClick={() => setLightboxFile(file)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-md cursor-pointer"
                                title="Quick View"
                              >
                                <Eye size={15} />
                              </button>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shadow-md flex items-center justify-center"
                                title="Open in new tab"
                              >
                                <ExternalLink size={15} />
                              </a>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    
                    {/* TRASH OVERLAY TRIGGER */}
                    <button
                      disabled={isDeleting === file.id}
                      onClick={() => handleDeleteFile(file.id)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-red-500/80 text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 shadow-md cursor-pointer disabled:opacity-50"
                      title="Delete asset"
                    >
                      <Trash2 size={13} className={isDeleting === file.id ? "animate-pulse" : ""} />
                    </button>
                  </div>

                  {/* DETAILS PANELS */}
                  <div className="p-4 flex flex-col flex-1 min-w-0 justify-between">
                    <div className="min-w-0">
                      <h4 className="font-medium text-xs text-white/90 truncate select-all" title={file.filename}>
                        {file.filename}
                      </h4>
                      
                      <div className="text-[10px] text-white/35 mt-1.5 flex items-center gap-1.5">
                        <span className="absolute top-2 left-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono uppercase text-[9px]">
                          {file.mediaType.split("/")[1] || "unknown"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 mt-4 pt-3.5 flex items-center justify-between text-[10px] text-white/30 shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="opacity-80" />
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{fileSizeStr}</span>
                      </div>
                      
                      <button
                        onClick={() => handleDownload(file.url, file.filename)}
                        className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:text-white transition-all font-medium text-white/70 cursor-pointer"
                        title="Download File"
                      >
                        <Download size={10} />
                        <span>Get</span>
                      </button>
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxFile(null)}
        >
          <button 
            type="button"
            className="absolute top-6 right-6 size-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
            onClick={() => setLightboxFile(null)}
          >
            <X className="size-5" />
          </button>
          
          <div className="flex flex-col items-center gap-3 max-w-[95vw] max-h-[90vh]">
            {lightboxFile.mediaType?.startsWith("image/") ? (
              <img 
                src={lightboxFile.url} 
                alt={lightboxFile.filename} 
                className="max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            ) : lightboxFile.mediaType?.startsWith("video/") ? (
              <video 
                src={lightboxFile.url} 
                controls
                autoPlay
                className="max-h-[75vh] rounded-2xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <iframe 
                src={lightboxFile.url} 
                className="w-[85vw] h-[80vh] rounded-2xl shadow-2xl bg-white/5 border border-white/5 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className="text-white/60 text-xs px-4 py-1.5 rounded-full bg-white/5 border border-white/5 select-all" onClick={(e) => e.stopPropagation()}>
              {lightboxFile.filename} ({formatBytes(lightboxFile.size)})
            </span>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, FileText, RefreshCw, FolderOpen, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

interface GalleryItem {
  id: string;
  filename: string;
  url: string;
  mediaType: string;
  size?: number;
  uploadedAt?: number;
}

interface GallerySidePanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onClose: () => void;
  onSelectFile: (file: GalleryItem) => void;
}

export function GallerySidePanel({
  searchQuery,
  setSearchQuery,
  onClose,
  onSelectFile,
}: GallerySidePanelProps) {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "image" | "file">("all");

  const fetchGalleryItems = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch("/api/vault?type=gallery");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const gallery = data.items?.find((item: any) => item.type === "gallery");
      setGalleryItems(gallery?.content || []);
    } catch (e) {
      console.error("Failed to fetch gallery items:", e);
      toast.error("Failed to load gallery items from Vault");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Filter items based on search query and category type
  const filteredItems = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchesSearch = item.filename?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === "all") return true;
      const isImg = item.mediaType?.startsWith("image/");
      return filterType === "image" ? isImg : !isImg;
    });
  }, [galleryItems, searchQuery, filterType]);

  return (
    <div className="flex flex-col h-full backdrop-blur-xl border-l border-white/5 w-full">
      {/* Panel Header */}
      <div className="h-16 px-3 border-b border-white/6 flex items-center justify-between bg-black">
        {/* Category Tabs Filter */}
        <div className="flex items-center bg-white/3 p-0.5 pl-1 pr-0.5 rounded-full border border-white/5">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${filterType === "all"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white"
              }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterType("image")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${filterType === "image"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white"
              }`}
          >
            IMAGES
          </button>
          <button
            onClick={() => setFilterType("file")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${filterType === "file"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white"
              }`}
          >
            FILES
          </button>

          <Button
            size="icon"
            title="Refresh"
            variant="outline"
            disabled={isRefreshing || isLoading}
            onClick={() => fetchGalleryItems(true)}
            className="size-8 border border-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          </Button>
        </div>

        {/* Close Button */}
        <Button
          size="icon"
          title="Close"
          variant="outline"
          onClick={onClose}
          className="size-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="size-8 rounded-full border-2 border-white/5 border-t-purple-400 animate-spin" />
            <span className="text-xs text-white/30 font-medium">Loading your gallery...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertCircle className="size-8 text-white/10 mb-3" />
            <p className="text-xs font-semibold text-white/50">No Assets Found</p>
            <p className="text-[10px] text-white/20 max-w-[200px] mt-1">
              {searchQuery ? `No files matched "${searchQuery}"` : "Your Vault Gallery is currently empty."}
            </p>
          </div>
        ) : (
          /* Staggered Masonry Pinterest Layout */
          <div className="columns-2 gap-3 [column-fill:_balance] w-full pb-6">
            {filteredItems.map((file) => {
              const isImage = file.mediaType?.startsWith("image/");
              const fileExtension = file.filename?.split(".").pop()?.toUpperCase() || "FILE";

              return (
                <button
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  className="break-inside-avoid mb-3 flex flex-col rounded-xl overflow-hidden bg-white/1 border border-white/5 hover:border-purple-500/30 hover:bg-white/2 transition-all text-left duration-300 group active:scale-[0.98] w-full cursor-pointer"
                >
                  {/* Gallery Visual Preview Area */}
                  {isImage ? (
                    <div title={file?.filename} className="w-full overflow-hidden relative bg-black/40 flex items-center justify-center shrink-0 cursor-pointer">
                      <a
                        href={file?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 hover:bg-purple-500/80 border border-white/10 text-white hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-md z-10"
                        title="View Full Image"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                      <img
                        src={file?.url}
                        alt={file?.filename}
                        className="w-full h-auto object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className="relative flex flex-col items-center justify-center gap-2 w-full pt-6 pb-2 bg-purple-500/2 group-hover:bg-purple-500/4 transition-colors border-b border-white/5 shrink-0">
                        <a
                          href={file?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-1 left-1 p-1 rounded-full bg-black/60 hover:bg-purple-500/80 border border-white/10 text-white hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-md z-10"
                          title="Open/View File"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                        <FileText className="size-7 text-purple-400/80 group-hover:text-purple-300 group-hover:scale-105 transition-all duration-300" />
                        <span className="absolute top-1 right-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[8px] font-bold text-purple-300 uppercase tracking-wider font-mono">
                          {fileExtension}
                        </span>

                        <div className="flex flex-col w-full px-2.5 py-1">
                          <span title={file?.filename} className="text-[10px] font-medium text-white/90 truncate group-hover:text-purple-300 transition-colors leading-normal">
                            {file?.filename}
                          </span>
                          <span title={formatBytes(file?.size)} className="text-[8px] text-white/30 font-mono mt-0.5">
                            {formatBytes(file?.size)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel Footer / Quick Tips */}
      <div className="p-3 border-t border-white/5 bg-white/[0.01] text-center">
        <div className="relative flex items-center">
          <Search className="absolute left-3 size-3.5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gallery assets..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/5 rounded-full text-xs text-white placeholder:text-white/20 outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all"
          />
        </div>
      </div>
    </div>
  );
}

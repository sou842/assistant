import React from 'react';

export function YouTubeCard({ data }: { data: any }) {
  const videos = data?.videos || (data?.videoId ? [data] : []);

  if (videos.length === 0) return null;

  return (
    <div className="flex overflow-x-auto gap-4 mt-4 w-full pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {videos.map((video: any, i: number) => (
        <div key={video.videoId || i} className="shrink-0 w-[280px] sm:w-[320px] rounded-xl overflow-hidden border border-app-border-subtle bg-app-surface/50 shadow-sm snap-start">
          <div className="relative pt-[56.25%] w-full bg-black/10">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {video.title && (
            <div className="p-3">
              <h3 className="font-medium text-sm text-app-text-primary line-clamp-2">{video.title}</h3>
              {video.channelTitle && (
                <p className="text-xs text-app-text-muted mt-1">{video.channelTitle}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

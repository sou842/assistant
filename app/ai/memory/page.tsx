"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MemoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ai/setting?tab=memory");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center bg-app-canvas text-app-text-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 rounded-full border-2 border-app-border-default border-t-app-text-primary animate-spin" />
        <span className="text-xs uppercase tracking-[0.3em] text-app-text-ghost">
          Redirecting to Settings...
        </span>
      </div>
    </div>
  );
}

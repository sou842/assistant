import type { Metadata } from "next";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AIProvider } from "./_components/ai-provider";
import { AIShell } from "./_components/ai-shell";
import { Suspense } from "react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: 'Jarvis AI',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Authenticated Jarvis workspace for tasks, memory, scheduling, and integrations.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ai-layout min-h-screen bg-app-surface text-app-text-primary">
      <Suspense>
        <AIProvider>
          <AIShell>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AIShell>
        </AIProvider>
      </Suspense>
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}

import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AIProvider } from "./_components/ai-provider";
import { AIShell } from "./_components/ai-shell";
import { Suspense } from "react";

export default function AILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ai-layout bg-[#0A0A0A] min-h-screen text-white">
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

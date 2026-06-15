"use client";

import React, { Suspense, useRef, useState } from "react";
import { Blocks, Play, Square } from "lucide-react";
import { PageHeader } from "../../_components/page-header";
import FlowCanvas, { FlowCanvasHandle } from "@/components/playground/FlowCanvas";
import { useSearchParams } from "next/navigation";

function PlaygroundContent() {
  const canvasRef = useRef<FlowCanvasHandle>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  return (
    <div className="flex h-screen flex-col bg-app-canvas">
      <PageHeader
        icon={<Blocks />}
        backHref="/ai/playground"
        title="Agentic Workflow Builder"
        subtitle="Connect AI tools together to build custom workflows."
      >
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={() => canvasRef.current?.runWorkflow()}
            disabled={isExecuting}
            className="flex h-9 items-center gap-2 rounded-full bg-app-primary px-4 text-xs font-semibold text-app-primary-foreground shadow-2xl transition hover:bg-app-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
            {isExecuting ? "Running..." : "Run Workflow"}
          </button>
        </div>
      </PageHeader>

      <div className="flex-1 relative overflow-hidden">
        <FlowCanvas ref={canvasRef} onExecutingChange={setIsExecuting} initialTemplateId={templateId} />
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <PlaygroundContent />
    </Suspense>
  );
}

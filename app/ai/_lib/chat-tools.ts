import { type SaveMemoryToolOutput } from "@/app/ai/_types/chat-tools";

export const getSaveMemoryToolOutputs = (message: { parts?: unknown[] }) =>
  (message.parts ?? []).flatMap((part) => {
    const toolPart = part as {
      type?: string;
      state?: string;
      toolCallId?: string;
      output?: unknown;
    };

    if (toolPart.type !== "tool-saveMemory" || toolPart.state !== "output-available") {
      return [];
    }

    const output = toolPart.output as Partial<SaveMemoryToolOutput> | undefined;
    if (output?.action !== "save_memory" || output.status !== "ready_for_client_persist" || !output.memory?.content) {
      return [];
    }

    return [{ toolCallId: toolPart.toolCallId ?? output.memory.content, output: output as SaveMemoryToolOutput }];
  });

import { type MemoryCategory } from "@/lib/memory-storage";

export type SaveMemoryToolOutput = {
  action: "save_memory";
  memory: {
    title: string;
    content: string;
    category: MemoryCategory;
    tags: string[];
  };
  status: "ready_for_client_persist";
};

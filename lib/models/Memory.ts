import mongoose, { Schema, Document } from 'mongoose';

export type MemoryCategory = "profile" | "preference" | "project" | "fact" | "instruction";
export type MemorySource = "manual" | "chat";

export interface IMemory extends Document {
  title: string;
  content: string;
  category: MemoryCategory;
  source: MemorySource;
  tags: string[];
  enabled: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { 
      type: String, 
      enum: ["profile", "preference", "project", "fact", "instruction"],
      default: "fact",
      index: true
    },
    source: { 
      type: String, 
      enum: ["manual", "chat"], 
      default: "manual" 
    },
    tags: [{ type: String }],
    enabled: { type: Boolean, default: true },
    userId: { type: String, index: true },
  },
  { timestamps: true }
);

MemorySchema.index({ updatedAt: -1 });

export default mongoose.models.Memory || mongoose.model<IMemory>('Memory', MemorySchema);

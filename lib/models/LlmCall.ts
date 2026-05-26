import mongoose, { Schema, Document } from 'mongoose';

export interface ILlmCall extends Document {
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  chatId?: string;
  modelName: string;
  systemPrompt?: string;
  messagesCount: number;
  steps: any[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const LlmCallSchema = new Schema<ILlmCall>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String },
    userEmail: { type: String },
    chatId: { type: String, index: true },
    modelName: { type: String, required: true },
    systemPrompt: { type: String },
    messagesCount: { type: Number, default: 0 },
    steps: [Schema.Types.Mixed],
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LlmCallSchema.index({ createdAt: -1 });

export default mongoose.models.LlmCall || mongoose.model<ILlmCall>('LlmCall', LlmCallSchema);

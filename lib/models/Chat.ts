import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: any[];
  createdAt: Date;
}

export interface IChat extends Document {
  title: string;
  messages: IMessage[];
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  toolInvocations: { type: [Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const ChatSchema = new Schema<IChat>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    title: { type: String, default: 'New Chat' },
    messages: [MessageSchema],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ChatSchema.index({ updatedAt: -1 });

export default mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStudioDocument extends Document {
  title: string;
  content: string; // Raw HTML content
  tags: string[];
  db?: Record<string, any>;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studioDocumentSchema = new Schema<IStudioDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    db: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
  },
  {
    timestamps: true,
  }
);

// Add text index for search
studioDocumentSchema.index({ title: 'text', tags: 'text', content: 'text' });

if (mongoose.models.StudioDocument) {
  delete mongoose.models.StudioDocument;
}

const StudioDocument: Model<IStudioDocument> = mongoose.model<IStudioDocument>('StudioDocument', studioDocumentSchema);

export default StudioDocument;

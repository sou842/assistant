import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVaultItem extends Document {
  title: string;
  type: 'spreadsheet' | 'note' | 'gallery' | 'album';
  content: any; // Using any/Mixed to accommodate Editor.js blocks, Spreadsheet JSON, or Gallery/Album media arrays
  tags: string[];
  coverImage?: string;
  userId: mongoose.Types.ObjectId;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vaultItemSchema = new Schema<IVaultItem>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['spreadsheet', 'note', 'gallery', 'album'],
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
    coverImage: {
      type: String,
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add text index for search
vaultItemSchema.index({ title: 'text', tags: 'text' });

if (mongoose.models.VaultItem) {
  delete mongoose.models.VaultItem;
}

const VaultItem: Model<IVaultItem> = mongoose.model<IVaultItem>('VaultItem', vaultItemSchema);

export default VaultItem;

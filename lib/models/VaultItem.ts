import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVaultItem extends Document {
  title: string;
  type: 'spreadsheet' | 'note' | 'gallery' | 'album';
  content: any; // Using any/Mixed to accommodate Editor.js blocks, Spreadsheet JSON, or Gallery/Album media arrays
  tags: string[];
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

const VaultItem: Model<IVaultItem> =
  mongoose.models.VaultItem || mongoose.model<IVaultItem>('VaultItem', vaultItemSchema);

export default VaultItem;

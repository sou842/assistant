import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAlbumPage extends Document {
  albumId: mongoose.Types.ObjectId;
  title: string;
  coverImage?: string;
  content: any; // Editor.js blocks
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const albumPageSchema = new Schema<IAlbumPage>(
  {
    albumId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'VaultItem', 
      required: true, 
      index: true 
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Page'
    },
    coverImage: {
      type: String,
      default: null,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.AlbumPage) {
  delete mongoose.models.AlbumPage;
}

const AlbumPage: Model<IAlbumPage> = mongoose.model<IAlbumPage>('AlbumPage', albumPageSchema);

export default AlbumPage;

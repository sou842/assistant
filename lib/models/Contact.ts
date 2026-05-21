import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  phone: string;
  category?: string;
  createdAt: Date;
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  category: { type: String, default: 'personal' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);

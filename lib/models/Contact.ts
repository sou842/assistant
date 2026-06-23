import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  phone?: string;
  email?: string;
  category?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ContactSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  category: { type: String, default: 'personal' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Delete cached model to allow hot-reloading schema changes in dev
delete mongoose.models.Contact;
export default mongoose.model<IContact>('Contact', ContactSchema);

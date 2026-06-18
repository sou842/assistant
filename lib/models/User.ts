import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional if using OAuth in the future
  role: 'user' | 'admin';
  githubAccessToken?: string;
  googleRefreshToken?: string;
  leetcodeUsername?: string;
  telegramChatId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String }, // Hashed password
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    githubAccessToken: { type: String },
    googleRefreshToken: { type: String },
    leetcodeUsername: { type: String },
    telegramChatId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

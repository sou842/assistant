import mongoose from 'mongoose';

const InstagramConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    instagramAccountId: {
      type: String,
      required: true,
      index: true,
    },
    pageId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

if (mongoose.models.InstagramConnection) {
  delete mongoose.models.InstagramConnection;
}

export default mongoose.model('InstagramConnection', InstagramConnectionSchema);

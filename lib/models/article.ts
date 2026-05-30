import mongoose, { Schema, model, models } from 'mongoose';

const ArticleSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Article = models.Article || model('Article', ArticleSchema);

export default Article;

import mongoose from 'mongoose';

const AutomationRuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['instagram'],
      default: 'instagram',
      required: true,
    },
    triggerKeyword: {
      type: String,
      required: true,
    },
    matchType: {
      type: String,
      enum: ['exact', 'contains'],
      default: 'contains',
    },
    replyMessage: {
      type: String,
    },
    dmContent: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models.AutomationRule) {
  delete mongoose.models.AutomationRule;
}

export default mongoose.model('AutomationRule', AutomationRuleSchema);

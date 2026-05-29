import mongoose from 'mongoose';

const ScheduleTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for this schedule task.'],
      maxlength: [140, 'Title cannot be more than 140 characters'],
    },
    steps: {
      type: Array,
      default: [],
    },
    scheduleType: {
      type: String,
      enum: ['one_time', 'recurring'],
      required: true,
    },
    runAt: { type: Date },
    intervalMinutes: { type: Number, min: 1 },
    cronExpr: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },
    nextRunAt: { type: Date, index: true },
    lastRunAt: { type: Date },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'failed'],
      default: 'active',
      index: true,
    },
    isRunning: { type: Boolean, default: false, index: true },
    lastError: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

if (mongoose.models.ScheduleTask) {
  delete mongoose.models.ScheduleTask;
}

export default mongoose.model('ScheduleTask', ScheduleTaskSchema);

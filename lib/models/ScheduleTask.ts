import mongoose from 'mongoose';

const ScheduleTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for this schedule task.'],
      maxlength: [140, 'Title cannot be more than 140 characters'],
    },
    actionType: {
      type: String,
      enum: ['weather_report', 'reminder'],
      required: true,
    },
    payload: {
      type: Object,
      default: {},
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
  },
  { timestamps: true }
);

export default mongoose.models.ScheduleTask || mongoose.model('ScheduleTask', ScheduleTaskSchema);

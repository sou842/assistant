import mongoose from 'mongoose';

const ScheduleTaskRunSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleTask',
      required: true,
      index: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    status: { type: String, enum: ['success', 'failed'], required: true },
    error: { type: String },
    response: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.models.ScheduleTaskRun || mongoose.model('ScheduleTaskRun', ScheduleTaskRunSchema);

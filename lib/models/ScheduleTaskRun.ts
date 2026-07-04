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
    status: { type: String, enum: ['running', 'success', 'failed', 'paused'], required: true },
    error: { type: String },
    currentStepIndex: { type: Number, default: 0 },
    completedSteps: { type: Array, default: [] },
    context: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.ScheduleTaskRun || mongoose.model('ScheduleTaskRun', ScheduleTaskRunSchema);

import mongoose from 'mongoose';

const WorkflowSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for the workflow'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    script: {
      type: String,
      required: [true, 'Please provide the JavaScript script for the workflow'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models.Workflow) {
  delete mongoose.models.Workflow;
}

export default mongoose.model('Workflow', WorkflowSchema);

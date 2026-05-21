import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Please provide a title for this task.'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  description: { 
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
  },
  status: { 
    type: String, 
    enum: ['todo', 'in-progress', 'done', 'backlog'], 
    default: 'todo' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  dueDate: { 
    type: Date 
  },
  tags: [{ 
    type: String 
  }],
}, { 
  timestamps: true 
});

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);

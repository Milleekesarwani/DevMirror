const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    skill: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    prerequisites: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    resources: [
      {
        title: String,
        url: String
      }
    ],
    completedAt: {
      type: Date
    }
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
      index: true
    },
    tasks: [taskSchema],
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasksCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Method to recalculate progress percentage
roadmapSchema.methods.calculateProgress = function () {
  if (!this.tasks || this.tasks.length === 0) {
    this.progress = 0;
    this.totalTasks = 0;
    this.completedTasksCount = 0;
    return 0;
  }
  const completed = this.tasks.filter(t => t.status === 'completed').length;
  this.totalTasks = this.tasks.length;
  this.completedTasksCount = completed;
  this.progress = Math.round((completed / this.totalTasks) * 100);
  return this.progress;
};

const Roadmap = mongoose.model('Roadmap', roadmapSchema);

module.exports = Roadmap;

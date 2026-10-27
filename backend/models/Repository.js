const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    owner: {
      type: String,
      required: true,
      trim: true
    },
    repo: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    commitSha: {
      type: String,
      required: true
    },
    defaultBranch: {
      type: String,
      default: 'main'
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    technologies: [
      {
        name: { type: String, required: true },
        category: { type: String, default: 'General' }, // e.g. Frontend, Backend, Database, Auth, DevOps
        version: { type: String, default: '' },
        evidenceFile: { type: String, default: '' }
      }
    ],
    evidence: [
      {
        file: { type: String, required: true },
        snippet: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: String, default: 'code' }
      }
    ],
    fileTree: [
      {
        path: { type: String, required: true },
        type: { type: String, default: 'blob' }, // blob or tree
        size: { type: Number, default: 0 }
      }
    ],
    totalFiles: {
      type: Number,
      default: 0
    },
    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index to quickly find user repos
repositorySchema.index({ userId: 1, owner: 1, repo: 1 });

const Repository = mongoose.model('Repository', repositorySchema);

module.exports = Repository;

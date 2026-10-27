const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      unique: true,
      index: true
    },
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    targetBenchmark: {
      type: Number,
      default: 75 // Internal baseline benchmark
    },
    // Record of skill breakdown: score (0-100), count, benchmark, gap
    skillScores: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    unassessedSkills: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    summaryFeedback: {
      type: String,
      default: ''
    },
    questionDetails: [
      {
        questionId: String,
        question: String,
        skill: String,
        sourceFile: String,
        score: Number,
        maxScore: Number,
        userAnswer: String,
        feedback: String
      }
    ]
  },
  {
    timestamps: true
  }
);

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;

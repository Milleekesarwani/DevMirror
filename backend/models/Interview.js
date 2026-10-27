const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    skill: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['junior', 'intermediate', 'senior'],
      default: 'intermediate'
    },
    question: {
      type: String,
      required: true
    },
    sourceFile: {
      type: String,
      required: true
    },
    // Server-side rubric: NEVER sent to the client browser
    rubric: {
      keyConcepts: [{ type: String }],
      expectedPoints: [{ type: String }],
      correctnessMax: { type: Number, default: 5 },
      reasoningMax: { type: Number, default: 3 },
      clarityMax: { type: Number, default: 2 },
      maxScore: { type: Number, default: 10 }
    }
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true
    },
    answerText: {
      type: String,
      default: ''
    },
    evaluation: {
      score: { type: Number, default: 0 },
      maxScore: { type: Number, default: 10 },
      correctness: { type: Number, default: 0 }, // 0 - 5
      reasoning: { type: Number, default: 0 },   // 0 - 3
      clarity: { type: Number, default: 0 },     // 0 - 2
      feedback: { type: String, default: '' },
      matchedConcepts: [{ type: String }]
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true
    },
    questions: [questionSchema],
    answers: [answerSchema],
    overallScore: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

/**
 * Return safe public view of interview questions without revealing rubrics to the client
 */
interviewSchema.methods.toClientJSON = function () {
  const obj = this.toObject();
  if (obj.questions) {
    obj.questions = obj.questions.map(q => ({
      id: q.id,
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      sourceFile: q.sourceFile
      // rubric is deliberately omitted
    }));
  }
  return obj;
};

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;

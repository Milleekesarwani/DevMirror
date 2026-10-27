const { z } = require('zod');
const Interview = require('../models/Interview');
const Repository = require('../models/Repository');
const Assessment = require('../models/Assessment');
const Roadmap = require('../models/Roadmap');
const { generateInterviewQuestions } = require('../services/questionService');
const { evaluateAnswer } = require('../services/evaluationService');
const { generateSkillAssessment } = require('../services/skillAnalysisService');
const { generateRoadmap } = require('../services/roadmapService');

const startInterviewSchema = z.object({
  repositoryId: z.string().min(1, 'Repository ID is required')
});

const submitAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answerText: z.string().default('')
});

/**
 * @route   POST /api/interviews/start
 * @desc    Start a new interview session for an analyzed repository
 * @access  Private
 */
const startInterview = async (req, res, next) => {
  try {
    const { repositoryId } = req.body;

    // Verify repository exists and belongs to current user
    const repo = await Repository.findOne({
      _id: repositoryId,
      userId: req.user._id
    });

    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found or does not belong to you.'
      });
    }

    // Generate 6-8 questions grounded in repository snapshot
    const generatedQuestions = await generateInterviewQuestions(repo);

    // Create and persist interview session
    const interview = await Interview.create({
      userId: req.user._id,
      repositoryId: repo._id,
      status: 'in_progress',
      questions: generatedQuestions,
      answers: [],
      totalQuestions: generatedQuestions.length
    });

    // Security Guardrail: Return questions to client WITHOUT hidden rubrics
    res.status(201).json({
      success: true,
      message: 'Interview session initialized.',
      interview: interview.toClientJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/interviews/:id/answers
 * @desc    Submit an answer for a specific question
 * @access  Private
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questionId, answerText } = req.body;

    const interview = await Interview.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found or unauthorized.'
      });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'This interview has already been finalized and cannot accept further answers.'
      });
    }

    // Find target question in interview
    const question = interview.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question ID not found in this interview session.'
      });
    }

    // Evaluate answer against server-side rubric
    const evaluation = await evaluateAnswer(question.question, question.rubric, answerText);

    // Update or append answer
    const existingIndex = interview.answers.findIndex(a => a.questionId === questionId);
    if (existingIndex !== -1) {
      interview.answers[existingIndex] = {
        questionId,
        answerText,
        evaluation,
        submittedAt: new Date()
      };
    } else {
      interview.answers.push({
        questionId,
        answerText,
        evaluation,
        submittedAt: new Date()
      });
    }

    await interview.save();

    res.status(200).json({
      success: true,
      message: 'Answer recorded successfully.',
      questionId,
      evaluation: {
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        feedback: evaluation.feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/interviews/:id/finish
 * @desc    Finalize interview, evaluate all answers, generate assessment & roadmap
 * @access  Private
 */
const finishInterview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found or unauthorized.'
      });
    }

    // Guard against double finalization
    if (interview.status === 'completed') {
      const existingAssessment = await Assessment.findOne({ interviewId: interview._id });
      return res.status(200).json({
        success: true,
        message: 'Interview was already finalized.',
        interview: interview.toClientJSON(),
        assessment: existingAssessment
      });
    }

    const repo = await Repository.findById(interview.repositoryId);

    // Ensure all questions have an answer entry (fill in blanks if skipped)
    for (const q of interview.questions) {
      const answered = interview.answers.some(a => a.questionId === q.id);
      if (!answered) {
        const blankEval = await evaluateAnswer(q.question, q.rubric, '');
        interview.answers.push({
          questionId: q.id,
          answerText: '',
          evaluation: blankEval,
          submittedAt: new Date()
        });
      }
    }

    // Mark as completed
    interview.status = 'completed';
    interview.completedAt = new Date();

    // Calculate total score
    const totalEarned = interview.answers.reduce((acc, a) => acc + (a.evaluation?.score || 0), 0);
    const totalMax = interview.answers.reduce((acc, a) => acc + (a.evaluation?.maxScore || 10), 0);
    interview.overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    await interview.save();

    // Generate comprehensive skill assessment
    const assessmentData = generateSkillAssessment(interview, repo);

    // Persist or update assessment
    let assessment = await Assessment.findOne({ interviewId: interview._id });
    if (assessment) {
      Object.assign(assessment, assessmentData);
      await assessment.save();
    } else {
      assessment = await Assessment.create({
        userId: req.user._id,
        interviewId: interview._id,
        repositoryId: interview.repositoryId,
        ...assessmentData
      });
    }

    // Generate personalized learning roadmap
    const roadmapTasks = generateRoadmap(assessment);

    // Save or update roadmap for user
    let roadmap = await Roadmap.findOne({ userId: req.user._id });
    if (roadmap) {
      // Merge tasks, keeping already completed tasks completed!
      const existingCompletedIds = new Set(
        roadmap.tasks.filter(t => t.status === 'completed').map(t => t.id)
      );

      roadmap.assessmentId = assessment._id;
      roadmap.tasks = roadmapTasks.map(task => {
        if (existingCompletedIds.has(task.id)) {
          return { ...task, status: 'completed' };
        }
        return task;
      });
      roadmap.calculateProgress();
      await roadmap.save();
    } else {
      roadmap = new Roadmap({
        userId: req.user._id,
        assessmentId: assessment._id,
        tasks: roadmapTasks
      });
      roadmap.calculateProgress();
      await roadmap.save();
    }

    res.status(200).json({
      success: true,
      message: 'Interview finalized successfully.',
      interview: interview.toClientJSON(),
      assessment,
      roadmap
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/interviews/:id
 * @desc    Get interview details by ID
 * @access  Private
 */
const getInterviewById = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found or unauthorized.'
      });
    }

    res.status(200).json({
      success: true,
      interview: interview.toClientJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/interviews
 * @desc    List all interviews for the current user
 * @access  Private
 */
const getUserInterviews = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id })
      .populate('repositoryId', 'owner repo url')
      .sort({ createdAt: -1 });

    const safeInterviews = interviews.map(i => i.toClientJSON());

    res.status(200).json({
      success: true,
      count: safeInterviews.length,
      interviews: safeInterviews
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  finishInterview,
  getInterviewById,
  getUserInterviews,
  startInterviewSchema,
  submitAnswerSchema
};

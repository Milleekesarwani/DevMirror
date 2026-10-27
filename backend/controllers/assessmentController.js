const Assessment = require('../models/Assessment');

/**
 * @route   GET /api/assessments/:id
 * @desc    Get detailed skill assessment report by ID
 * @access  Private
 */
const getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('repositoryId', 'owner repo url commitSha technologies evidence')
      .populate('interviewId', 'status overallScore createdAt completedAt');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment report not found or unauthorized.'
      });
    }

    res.status(200).json({
      success: true,
      assessment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/assessments
 * @desc    List all assessments for the current user
 * @access  Private
 */
const getUserAssessments = async (req, res, next) => {
  try {
    const assessments = await Assessment.find({ userId: req.user._id })
      .populate('repositoryId', 'owner repo url')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assessments.length,
      assessments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssessmentById,
  getUserAssessments
};

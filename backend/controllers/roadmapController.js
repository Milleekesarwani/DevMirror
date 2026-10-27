const { z } = require('zod');
const Roadmap = require('../models/Roadmap');

const updateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed'])
});

/**
 * @route   GET /api/roadmap
 * @desc    Get the current personalized learning roadmap for the authenticated user
 * @access  Private
 */
const getRoadmap = async (req, res, next) => {
  try {
    let roadmap = await Roadmap.findOne({ userId: req.user._id })
      .populate('assessmentId', 'overallScore strengths weaknesses');

    if (!roadmap) {
      return res.status(200).json({
        success: true,
        message: 'No roadmap generated yet. Complete an interview assessment to generate your personalized learning plan.',
        roadmap: null
      });
    }

    res.status(200).json({
      success: true,
      roadmap
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/roadmap/tasks/:id
 * @desc    Update task status (e.g. mark as completed) and recalculate progress
 * @access  Private
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const roadmap = await Roadmap.findOne({ userId: req.user._id });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found.'
      });
    }

    const task = roadmap.tasks.find(t => t.id === id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task '${id}' not found in your learning roadmap.`
      });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    roadmap.calculateProgress();
    await roadmap.save();

    res.status(200).json({
      success: true,
      message: `Task '${task.title}' updated to ${status}.`,
      progress: roadmap.progress,
      completedTasksCount: roadmap.completedTasksCount,
      totalTasks: roadmap.totalTasks,
      task
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoadmap,
  updateTaskStatus,
  updateTaskStatusSchema
};

const Repository = require('../models/Repository');
const Interview = require('../models/Interview');
const Assessment = require('../models/Assessment');
const Roadmap = require('../models/Roadmap');

/**
 * @route   GET /api/dashboard
 * @desc    Aggregate dashboard statistics, Chart.js dataset, and SkillStock trend calculations
 * @access  Private
 */
const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Repositories summary
    const repos = await Repository.find({ userId })
      .sort({ analyzedAt: -1 })
      .select('owner repo url commitSha technologies totalFiles analyzedAt');

    // 2. Assessments history
    const assessments = await Assessment.find({ userId })
      .sort({ createdAt: -1 })
      .populate('repositoryId', 'owner repo');

    // 3. Active Roadmap
    const roadmap = await Roadmap.findOne({ userId });

    // Empty state handling for newly registered users
    if (assessments.length === 0) {
      return res.status(200).json({
        success: true,
        emptyState: true,
        message: 'No assessments completed yet. Analyze a repository and complete your first interview to view your dashboard analytics.',
        repositoriesCount: repos.length,
        repositories: repos,
        skillStock: {
          status: 'Not enough history',
          delta: 0,
          history: []
        },
        skillsChart: {
          labels: [],
          scores: [],
          benchmarks: []
        },
        roadmap: roadmap
          ? {
              progress: roadmap.progress,
              completed: roadmap.completedTasksCount,
              total: roadmap.totalTasks
            }
          : null
      });
    }

    const latestAssessment = assessments[0];

    // Format Chart.js datasets from latest assessment
    const chartLabels = [];
    const chartScores = [];
    const chartBenchmarks = [];
    const skillGaps = [];

    const skillScoresMap = latestAssessment.skillScores instanceof Map
      ? Object.fromEntries(latestAssessment.skillScores)
      : latestAssessment.skillScores || {};

    for (const [skill, info] of Object.entries(skillScoresMap)) {
      chartLabels.push(skill);
      chartScores.push(info.score);
      chartBenchmarks.push(info.benchmark);
      if (info.gap > 0) {
        skillGaps.push({
          skill,
          score: info.score,
          benchmark: info.benchmark,
          gap: info.gap,
          status: info.status
        });
      }
    }

    // 4. SkillStock Trend Calculation
    // Session 13 requirement: Only show up/down changes when at least two comparable assessments exist; otherwise display "Not enough history"
    let skillStock = {
      status: 'Not enough history',
      delta: 0,
      direction: 'neutral',
      currentScore: latestAssessment.overallScore,
      previousScore: null,
      history: assessments.map(a => ({
        id: a._id,
        date: a.createdAt,
        score: a.overallScore,
        repo: a.repositoryId ? `${a.repositoryId.owner}/${a.repositoryId.repo}` : 'Repository'
      }))
    };

    if (assessments.length >= 2) {
      const current = assessments[0].overallScore;
      const previous = assessments[1].overallScore;
      const delta = current - previous;

      skillStock = {
        status: delta > 0 ? `+${delta}%` : `${delta}%`,
        delta,
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
        currentScore: current,
        previousScore: previous,
        history: skillStock.history
      };
    }

    res.status(200).json({
      success: true,
      emptyState: false,
      summary: {
        totalRepositories: repos.length,
        totalAssessments: assessments.length,
        latestScore: latestAssessment.overallScore,
        targetBenchmark: latestAssessment.targetBenchmark
      },
      repositories: repos,
      latestAssessment: {
        id: latestAssessment._id,
        overallScore: latestAssessment.overallScore,
        strengths: latestAssessment.strengths,
        weaknesses: latestAssessment.weaknesses,
        summaryFeedback: latestAssessment.summaryFeedback,
        unassessedSkills: latestAssessment.unassessedSkills,
        createdAt: latestAssessment.createdAt
      },
      skillsChart: {
        labels: chartLabels,
        scores: chartScores,
        benchmarks: chartBenchmarks
      },
      skillGaps,
      skillStock,
      roadmap: roadmap
        ? {
            id: roadmap._id,
            progress: roadmap.progress,
            completed: roadmap.completedTasksCount,
            total: roadmap.totalTasks,
            pendingTasks: roadmap.tasks.filter(t => t.status !== 'completed').slice(0, 5)
          }
        : null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData
};

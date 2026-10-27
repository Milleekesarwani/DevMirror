const { z } = require('zod');
const Repository = require('../models/Repository');
const { analyzeRepository } = require('../services/githubService');

const analyzeRepoSchema = z.object({
  url: z.string().min(1, 'Repository URL is required')
});

/**
 * @route   POST /api/repos/analyze
 * @desc    Analyze a public GitHub repository and store results
 * @access  Private
 */
const analyzeRepo = async (req, res, next) => {
  try {
    const { url } = req.body;

    // Run analysis through GitHub service (pure public repository access)
    const analysisData = await analyzeRepository(url);

    // Check if user already analyzed this repo at this commit
    let repoDoc = await Repository.findOne({
      userId: req.user._id,
      owner: analysisData.owner,
      repo: analysisData.repo
    });

    if (repoDoc) {
      // Update existing record
      Object.assign(repoDoc, {
        ...analysisData,
        analyzedAt: new Date()
      });
      await repoDoc.save();
    } else {
      // Create new record
      repoDoc = await Repository.create({
        userId: req.user._id,
        ...analysisData
      });
    }

    res.status(200).json({
      success: true,
      message: `Repository ${analysisData.owner}/${analysisData.repo} analyzed successfully.`,
      repository: repoDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repos
 * @desc    Get all analyzed repositories for current user
 * @access  Private
 */
const getUserRepos = async (req, res, next) => {
  try {
    const repos = await Repository.find({ userId: req.user._id })
      .sort({ analyzedAt: -1 })
      .select('-fileTree'); // Exclude large file tree from listing

    res.status(200).json({
      success: true,
      count: repos.length,
      repositories: repos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repos/:id
 * @desc    Get detailed repository analysis with file tree and evidence
 * @access  Private
 */
const getRepoById = async (req, res, next) => {
  try {
    const repo = await Repository.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository analysis not found or unauthorized.'
      });
    }

    res.status(200).json({
      success: true,
      repository: repo
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeRepo,
  getUserRepos,
  getRepoById,
  analyzeRepoSchema
};

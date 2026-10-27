const express = require('express');
const router = express.Router();
const {
  analyzeRepo,
  getUserRepos,
  getRepoById,
  analyzeRepoSchema
} = require('../controllers/repoController');
const { requireAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { repoAnalysisLimiter } = require('../middleware/rateLimiter');

// All repo routes require authentication
router.use(requireAuth);

router.post('/analyze', repoAnalysisLimiter, validate(analyzeRepoSchema), analyzeRepo);
router.get('/', getUserRepos);
router.get('/:id', getRepoById);

module.exports = router;

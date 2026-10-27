const express = require('express');
const router = express.Router();
const {
  startInterview,
  submitAnswer,
  finishInterview,
  getInterviewById,
  getUserInterviews,
  startInterviewSchema,
  submitAnswerSchema
} = require('../controllers/interviewController');
const { requireAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

// All interview routes are protected
router.use(requireAuth);

router.post('/start', validate(startInterviewSchema), startInterview);
router.post('/:id/answers', validate(submitAnswerSchema), submitAnswer);
router.post('/:id/finish', finishInterview);
router.get('/:id', getInterviewById);
router.get('/', getUserInterviews);

module.exports = router;

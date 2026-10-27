const express = require('express');
const router = express.Router();
const {
  getAssessmentById,
  getUserAssessments
} = require('../controllers/assessmentController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/:id', getAssessmentById);
router.get('/', getUserAssessments);

module.exports = router;

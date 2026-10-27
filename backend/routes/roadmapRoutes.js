const express = require('express');
const router = express.Router();
const {
  getRoadmap,
  updateTaskStatus,
  updateTaskStatusSchema
} = require('../controllers/roadmapController');
const { requireAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

router.use(requireAuth);

router.get('/', getRoadmap);
router.patch('/tasks/:id', validate(updateTaskStatusSchema), updateTaskStatus);

module.exports = router;

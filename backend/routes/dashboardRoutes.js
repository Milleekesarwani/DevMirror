const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', getDashboardData);

module.exports = router;

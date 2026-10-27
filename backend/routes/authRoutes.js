const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  registerSchema,
  loginSchema
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth, csrfProtection } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public auth routes with rate limiting and validation
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);

// Protected routes
router.get('/me', requireAuth, getMe);

module.exports = router;

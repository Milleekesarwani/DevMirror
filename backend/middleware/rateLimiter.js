const rateLimit = require('express-rate-limit');

/**
 * Standard API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  skip: () => process.env.NODE_ENV === 'test'
});

/**
 * Stricter rate limiter for authentication routes (login / register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  skip: () => process.env.NODE_ENV === 'test'
});

/**
 * Rate limiter for GitHub repo analysis to prevent abuse
 */
const repoAnalysisLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 repo analyses per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many repository analysis requests, please slow down.'
  },
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = {
  apiLimiter,
  authLimiter,
  repoAnalysisLimiter
};

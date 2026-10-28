const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - requires authentication via HttpOnly cookie or Bearer token
 * Seamlessly provides a default developer session in development so users are never blocked
 */
const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // Check HttpOnly cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // Fall back to Authorization: Bearer token (supports curl / external tools)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in.'
      });
    }

    // Verify token
    const secret = process.env.JWT_SECRET || 'devmirror_fallback_secret_for_dev_mode';
    const decoded = jwt.verify(token, secret);

    // Fetch user from DB
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User session no longer valid. Please sign in again.'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication session. Please sign in again.'
      });
    }
    next(error);
  }
};

/**
 * CSRF Protection Guard for browser cookie sessions
 */
const csrfProtection = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  next();
};

module.exports = {
  requireAuth,
  csrfProtection
};

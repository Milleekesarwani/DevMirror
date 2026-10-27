const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');

// Zod schemas for input validation
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
  targetRole: z.enum([
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Software Engineer'
  ]).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required')
});

/**
 * Generate JWT and configure HttpOnly cookie options
 */
const generateTokenAndSetCookie = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'devmirror_fallback_secret_for_dev_mode';
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true, // Prevents XSS script access
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  };

  res.cookie('token', token, cookieOptions);
  return token;
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, targetRole } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      targetRole: targetRole || 'Full Stack Developer'
    });

    // Generate token and set HttpOnly cookie
    const token = generateTokenAndSetCookie(res, user._id);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & set token cookie
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Generate token and set HttpOnly cookie
    const token = generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookie
 * @access  Public
 */
const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: new Date(0) // Expire immediately
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      targetRole: req.user.targetRole,
      createdAt: req.user.createdAt
    }
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  registerSchema,
  loginSchema
};

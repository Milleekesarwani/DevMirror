const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import route handlers
const authRoutes = require('./routes/authRoutes');
const repoRoutes = require('./routes/repoRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Security HTTP headers (disable strict CSP to allow fonts and inline script execution for frontend UI)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Explicit CORS Origin handling
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:5000',
  'https://devmirror-workspace-milee.berryvenus12.chatgpt.site'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith('.chatgpt.site') ||
        process.env.NODE_ENV !== 'production';

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy violation: This origin is not allowed.'));
    },
    credentials: true, // Allow cookies to be sent across origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
  })
);

// JSON body parser with size limit (cap at 1MB to prevent payload attacks)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parser for HttpOnly authentication cookies
app.use(cookieParser(process.env.COOKIE_SECRET || 'devmirror_cookie_secret'));

// Serve frontend static assets directly from /frontend, root, and public
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '../public')));

// Apply standard API rate limiter to all API endpoints
app.use('/api', apiLimiter);

// Health check endpoint (Session 1 requirement)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount application API routes
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/dashboard', dashboardRoutes);

// For all non-API GET requests, serve the connected frontend index.html
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`
    });
  }
  const fs = require('fs');
  const rootIndex = path.join(__dirname, '../index.html');
  const frontendIndex = path.join(frontendPath, 'index.html');
  const indexPath = fs.existsSync(rootIndex) ? rootIndex : frontendIndex;
  res.sendFile(indexPath);
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

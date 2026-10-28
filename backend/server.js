require('dotenv').config();
const http = require('http');
const express = require('express');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Start server function
const startServer = async () => {
  try {
    // Session 2 requirement: Start the server only after database connection succeeds
    await connectDB();

    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` DevMirror API Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('[Server] Fatal Error during server startup:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await disconnectDB();
    console.log('[Server] Process exited gracefully.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long (10 seconds timeout)
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions & unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});

// Execute server start if run directly
if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };

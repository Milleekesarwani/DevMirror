const app = require('../backend/app');
const { connectDB } = require('../backend/config/db');

let isDbInit = false;

module.exports = async (req, res) => {
  if (!isDbInit) {
    try {
      await connectDB();
      isDbInit = true;
    } catch (err) {
      console.warn('[Vercel Serverless] DB connection notice:', err.message);
    }
  }
  return app(req, res);
};

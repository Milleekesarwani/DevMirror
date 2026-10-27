const path = require('path');
const app = require('./backend/app');
const { connectDB } = require('./backend/config/db');

let isDbInit = false;

const handler = async (req, res) => {
  if (!isDbInit) {
    try {
      await connectDB();
      isDbInit = true;
    } catch (err) {
      console.warn('[DB] Connection notice:', err.message);
    }
  }
  return app(req, res);
};

module.exports = handler;

// Standalone execution support
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`DevMirror Server running on port ${PORT}`);
    });
  });
}

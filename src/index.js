const express = require('express');
const app = require('../backend/app');

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`DevMirror Server running on port ${PORT}`);
  });
}

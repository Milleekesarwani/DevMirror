const mongoose = require('mongoose');

let isConnected = false;
let memoryServer = null;

/**
 * Connect to MongoDB with robust retry, Atlas support, and automatic in-memory fallback for local dev
 */
const connectDB = async () => {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devmirror';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: process.env.NODE_ENV !== 'production'
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Database] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected.');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    // If local MongoDB is not running, provide automatic in-memory server fallback in development
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.warn(`[Database] Could not connect to '${uri}'.`);
        console.log('[Database] Starting local in-memory MongoDB instance for seamless development...');
        
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();

        const conn = await mongoose.connect(memUri, {
          autoIndex: true
        });

        isConnected = true;
        console.log(`[Database] In-Memory MongoDB Connected at: ${memUri}`);
        console.log('[Database] Ready for development and testing! (Set MONGODB_URI in backend/.env to use Atlas)');
        return conn;
      } catch (memError) {
        console.error('[Database] Failed to start in-memory MongoDB fallback:', memError.message);
        throw error;
      }
    } else {
      console.error(`[Database] Startup connection failed: ${error.message}`);
      throw error;
    }
  }
};

/**
 * Gracefully close the MongoDB connection
 */
const disconnectDB = async () => {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }
  try {
    await mongoose.connection.close();
    isConnected = false;
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log('[Database] MongoDB connection closed gracefully.');
  } catch (error) {
    console.error('[Database] Error closing MongoDB connection:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};

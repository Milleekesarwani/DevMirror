const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_unit_tests_32chars';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.COOKIE_SECRET = 'test_cookie_secret';

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);
  } catch (err) {
    // If MongoMemoryServer failed (e.g. EBUSY on Windows when another instance is running)
    const fallbackUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:50769/devmirror_test';
    process.env.MONGODB_URI = fallbackUri;
    await mongoose.connect(fallbackUri);
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

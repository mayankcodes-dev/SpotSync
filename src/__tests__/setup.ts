// Global test setup — runs before every test file
// Sets all required environment variables so modules can be imported without throwing

process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-groq-api-key';
process.env.UPSTASH_REDIS_REST_URL = 'https://fake-upstash.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-upstash-token';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_KEY = '123456789012345';
process.env.CLOUDINARY_SECRET = 'test-cloudinary-secret';
process.env.CLOUDINARY_URL = 'cloudinary://123456789012345:test-cloudinary-secret@test-cloud';
process.env.MAPTILER_API_KEY = 'test-maptiler-key';
process.env.DB_URL = 'mongodb://localhost:27017/spotsync-test';
process.env.SECRET = 'test-session-secret-for-jest';
process.env.PORT = '3001';

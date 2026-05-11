import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

// Read the in-memory MongoDB URI written by globalSetup.
// This runs at module-top-level so process.env is set before any test-file
// imports (e.g. app.ts → auth.ts) create their own MongoClient.
const URI_FILE = resolve(__dirname, '../../../.test-mongo-uri');
const mongoUri = readFileSync(URI_FILE, 'utf-8').trim();

process.env.MONGO_URI = mongoUri;
process.env.BETTER_AUTH_SECRET = 'test-secret-for-testing-purposes-abc12345!!';
process.env.BETTER_AUTH_URL = 'http://localhost:4000';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

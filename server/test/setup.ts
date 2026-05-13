import { beforeAll, afterAll, afterEach, inject } from 'vitest';
import mongoose from 'mongoose';

beforeAll(async () => {
  const uri = inject('MONGO_URI');
  process.env.MONGO_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.BETTER_AUTH_SECRET =
    process.env.BETTER_AUTH_SECRET ?? 'test-secret-which-is-long-enough-to-pass-validation';
  process.env.CLIENT_URL = 'http://localhost:5173';
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

declare module 'vitest' {
  export interface ProvidedContext {
    MONGO_URI: string;
  }
}

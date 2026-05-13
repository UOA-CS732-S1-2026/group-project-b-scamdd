import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer | undefined;

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGO_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.BETTER_AUTH_SECRET =
    process.env.BETTER_AUTH_SECRET ?? 'test-secret-which-is-long-enough-to-pass-validation';
  process.env.CLIENT_URL = 'http://localhost:5173';
  provide('MONGO_URI', uri);
}

export async function teardown() {
  await mongo?.stop();
}

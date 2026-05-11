import { MongoMemoryServer } from 'mongodb-memory-server';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const URI_FILE = resolve(__dirname, '../../../.test-mongo-uri');

let mongod: MongoMemoryServer;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  writeFileSync(URI_FILE, mongod.getUri() + 'bscamdd');
}

export async function teardown() {
  await mongod.stop();
  try {
    unlinkSync(URI_FILE);
  } catch {
    // file may already be gone
  }
}

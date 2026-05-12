import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { app } from '../server/src/app.js';

let connecting: Promise<typeof mongoose> | null = null;

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 5000 })
      .catch((err) => {
        connecting = null;
        console.error('[mongoose] connect failed:', err);
        throw err;
      });
  }
  await connecting;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDb();
  return (app as unknown as (r: VercelRequest, s: VercelResponse) => void)(req, res);
}

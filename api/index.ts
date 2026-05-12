import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { app } from '../server/src/app.js';

let connecting: Promise<typeof mongoose> | null = null;

async function ensureDb() {
  if (mongoose.connection.readyState === 1) {
    console.log('[mongoose] already connected');
    return;
  }
  console.log('[mongoose] connecting...');
  const t0 = Date.now();
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI!, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        bufferCommands: false,
      })
      .then((m) => {
        console.log(`[mongoose] connected in ${Date.now() - t0}ms`);
        return m;
      })
      .catch((err) => {
        connecting = null;
        console.error('[mongoose] connect failed:', err);
        throw err;
      });
  }
  await connecting;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[handler] ${req.method} ${req.url}`);
  await ensureDb();
  console.log(`[handler] forwarding to express`);
  return (app as unknown as (r: VercelRequest, s: VercelResponse) => void)(req, res);
}

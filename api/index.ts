import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { app } from '../server/src/app.js';

let connecting: Promise<typeof mongoose> | null = null;

async function ensureDb() {
  // If we think we're connected, verify with a fast-failing ping. Cached
  // connections in warm serverless functions often have dead underlying
  // sockets (Atlas drops idle ones) while mongoose still reports readyState=1.
  if (mongoose.connection.readyState === 1) {
    try {
      const ping = mongoose.connection.db!.admin().command({ ping: 1 });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ping timeout')), 2000),
      );
      await Promise.race([ping, timeout]);
      console.log('[mongoose] cached connection alive');
      return;
    } catch (err) {
      console.warn('[mongoose] cached connection dead, reconnecting:', (err as Error).message);
      await mongoose.disconnect().catch(() => {});
      connecting = null;
    }
  }

  console.log('[mongoose] connecting...');
  const t0 = Date.now();
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI!, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        bufferCommands: false,
        heartbeatFrequencyMS: 10000,
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

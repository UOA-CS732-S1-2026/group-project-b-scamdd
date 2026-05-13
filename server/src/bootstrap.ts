import mongoose from 'mongoose';
import { logger } from './lib/logger.js';
import { startWrappedCron } from './jobs/wrappedCron.js';

let dbConnecting: Promise<typeof mongoose> | null = null;

/**
 * Idempotent: connects to MongoDB if not already connected, and is safe to
 * call from every request handler on Vercel (where the function may be
 * cold-started but the connection survives within the function's lifetime).
 *
 * Must be called from server/src/* so it uses server/node_modules/mongoose,
 * the same instance the models import. Connecting a different mongoose copy
 * from api/ would leave models querying a disconnected instance and buffer
 * the query until the function timeout (PR #74 fixed exactly that).
 */
export async function ensureDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!dbConnecting) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set');
    }
    dbConnecting = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        bufferCommands: false,
        maxPoolSize: 5,
      })
      .catch((err) => {
        dbConnecting = null;
        throw err;
      });
  }
  await dbConnecting;
}

let bootstrapped = false;

/**
 * Bootstrapping that should only happen once per process lifetime.
 * Currently registers the monthly-wrapped cron job. Vercel functions skip
 * this (`withCron: false`) because serverless functions can't host cron.
 */
export function ensureBootstrapped({ withCron }: { withCron: boolean }): void {
  if (bootstrapped) return;
  bootstrapped = true;
  if (withCron) {
    try {
      startWrappedCron();
    } catch (err) {
      logger.error({ err }, 'startWrappedCron failed');
    }
  }
}

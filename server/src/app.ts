import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';
import transactionRoutes from './routes/transactions.js';
import profileRoutes from './routes/profile.js';
import goalRoutes from './routes/goals.js';
import budgetRoutes from './routes/budgets.js';
import sharedBudgetRoutes from './routes/sharedBudgets.js';
import friendRoutes from './routes/friends.js';
import gameRoutes from './routes/games.js';
import categoryRoutes from './routes/categories.js';
import achievementRoutes from './routes/achievements.js';
import cheerRoutes from './routes/cheers.js';
import wrappedRoutes from './routes/wrapped.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

// Connect mongoose lazily on first request. Must run from this file (not
// api/index.ts) so it uses server/node_modules/mongoose — the same instance
// the models import. Connecting a different mongoose copy from api/ leaves
// models querying a disconnected instance and the query buffers until the
// Vercel function timeout (10s) kills it. See PR #74.
let dbConnecting: Promise<typeof mongoose> | null = null;
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!dbConnecting) {
    dbConnecting = mongoose
      .connect(process.env.MONGO_URI!, {
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

app.use(async (_req, _res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    next(err);
  }
});

const allowedOrigins = [
  process.env.CLIENT_URL ?? 'http://localhost:5173',
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
    : []),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Must be mounted before express.json()
app.all('/api/auth/*path', toNodeHandler(auth));

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/shared-budgets', sharedBudgetRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/cheers', cheerRoutes);
app.use('/api/wrapped', wrappedRoutes);

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.use('/api', notFoundHandler);
app.use(errorHandler);

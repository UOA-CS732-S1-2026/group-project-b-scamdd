import express from 'express';
import cors from 'cors';
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

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
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

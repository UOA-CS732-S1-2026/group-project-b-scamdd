import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import transactionRoutes from './routes/transactions';
import profileRoutes from './routes/profile';
import goalRoutes from './routes/goals';
import budgetRoutes from './routes/budgets';
import friendRoutes from './routes/friends';
import gameRoutes from './routes/games';
import achievementRoutes from './routes/achievements';
import cheerRoutes from './routes/cheers';

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  }),
);

// Must be mounted before express.json()
app.all('/api/auth/*path', toNodeHandler(auth));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/cheers', cheerRoutes);

app.get('/favicon.ico', (_req, res) => res.status(204).end());

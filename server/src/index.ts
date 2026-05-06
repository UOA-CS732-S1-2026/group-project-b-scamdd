import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import transactionRoutes from './routes/transactions';
import profileRoutes from './routes/profile';
import goalRoutes from './routes/goals';
import budgetRoutes from './routes/budgets';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  credentials: true,
}));

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

app.get('/favicon.ico', (_req, res) => res.status(204).end());

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/bscamdd';

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${mongoUri}`);
  } catch (err) {
    console.error('MongoDB connection failed (server will still start):', err);
  }

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();

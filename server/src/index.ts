import 'dotenv/config';
import { app } from './app.js';
import { ensureBootstrapped, ensureDb } from './bootstrap.js';
import { logger } from './lib/logger.js';

const port = Number(process.env.PORT ?? 4000);

async function start() {
  try {
    await ensureDb();
    logger.info({ uri: process.env.MONGO_URI }, 'MongoDB connected');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed (server will still start)');
  }

  ensureBootstrapped({ withCron: true });

  app.listen(port, () => {
    logger.info({ port }, `Server listening on http://localhost:${port}`);
  });
}

start();

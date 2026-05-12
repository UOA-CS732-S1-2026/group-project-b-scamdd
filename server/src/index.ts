import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app';
import { startWrappedCron } from './jobs/wrappedCron';

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/bscamdd';

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${mongoUri}`);
  } catch (err) {
    console.error('MongoDB connection failed (server will still start):', err);
  }

  startWrappedCron();

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI ?? 'mongodb://localhost:27017/bscamdd');

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  trustedOrigins: [process.env.CLIENT_URL ?? 'http://localhost:5173'],
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});

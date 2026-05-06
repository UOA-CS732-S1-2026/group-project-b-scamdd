import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

const client = new MongoClient(process.env.MONGO_URI ?? 'mongodb://localhost:27017/bscamdd');

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  trustedOrigins: [process.env.CLIENT_URL ?? 'http://localhost:5173'],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/auth/reset-password?token=${token}`;
      if (transporter) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
          to: user.email,
          subject: 'Reset your password',
          html: `<p>Hi ${user.name ?? user.email},</p>
                 <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>
                 <p>If you didn't request this, you can ignore this email.</p>`,
        });
      } else {
        // No SMTP configured — log to console for local development
        console.log(`\n[Password Reset] Token for ${user.email}:\n${resetUrl}\n`);
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      username: { type: 'string', required: false, input: false },
      displayName: { type: 'string', required: false, input: false },
      bio: { type: 'string', required: false, input: false },
      currency: { type: 'string', required: false, defaultValue: 'NZD', input: false },
      profileComplete: { type: 'boolean', required: false, defaultValue: false, input: false },
    },
  },
});

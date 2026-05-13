import mongoose, { Schema } from 'mongoose';

export interface ITransaction {
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: Date;
  note?: string;
  mood?: string;
  essential?: boolean;
  paymentMethod?: string;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String },
    date: { type: Date, required: true },
    note: { type: String },
    mood: { type: String },
    essential: { type: Boolean },
    paymentMethod: { type: String },
  },
  { timestamps: true },
);

// Indexes for the routes' actual query patterns (audit H3). These are not
// auto-created in production — `autoIndex: false` is set on the connection.
// Run `pnpm db:index` from server/ on deploy to sync them.
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

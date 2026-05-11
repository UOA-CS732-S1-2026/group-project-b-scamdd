import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
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

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

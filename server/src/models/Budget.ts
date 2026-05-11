import mongoose, { Schema, Document } from 'mongoose';

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IBudget extends Document {
  userId: string;
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true, min: 0 },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BudgetSchema.index({ userId: 1, category: 1, period: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);

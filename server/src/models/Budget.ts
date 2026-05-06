import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
  userId: string;
  category: string;
  monthlyLimit: number;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true, min: 0 },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BudgetSchema.index({ userId: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);

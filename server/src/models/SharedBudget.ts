import mongoose, { Schema, Document } from 'mongoose';
import type { BudgetPeriod } from './Budget';

export type SharedBudgetMemberStatus = 'pending' | 'accepted';

export interface ISharedBudgetMember {
  userId: string;
  status: SharedBudgetMemberStatus;
  invitedBy: string;
  joinedAt?: Date;
}

export interface ISharedBudget extends Document {
  ownerId: string;
  name?: string;
  category: string;
  monthlyLimit: number;
  period: BudgetPeriod;
  members: ISharedBudgetMember[];
  createdAt?: Date;
  updatedAt?: Date;
}

const SharedBudgetMemberSchema = new Schema<ISharedBudgetMember>(
  {
    userId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    invitedBy: { type: String, required: true },
    joinedAt: { type: Date },
  },
  { _id: false },
);

const SharedBudgetSchema = new Schema<ISharedBudget>(
  {
    ownerId: { type: String, required: true, index: true },
    name: { type: String, trim: true, maxlength: 60 },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true, min: 0 },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    members: { type: [SharedBudgetMemberSchema], default: [] },
  },
  { timestamps: true },
);

SharedBudgetSchema.index({ 'members.userId': 1, 'members.status': 1 });

export const SharedBudget = mongoose.model<ISharedBudget>('SharedBudget', SharedBudgetSchema);

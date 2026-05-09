import mongoose, { Schema, Document } from 'mongoose';

export interface IGoal extends Document {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    targetAmount: { type: Number, required: true, min: 0 },
    currentAmount: { type: Number, required: true, min: 0, default: 0 },
    deadline: { type: Date, required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);

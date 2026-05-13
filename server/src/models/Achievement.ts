import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  userId: string;
  key: string;
  earnedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    userId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    earnedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

AchievementSchema.index({ userId: 1, key: 1 }, { unique: true });

export const Achievement = mongoose.model<IAchievement>('Achievement', AchievementSchema);

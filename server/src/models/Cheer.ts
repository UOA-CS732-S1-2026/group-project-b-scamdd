import mongoose, { Schema, Document } from 'mongoose';

export interface ICheer extends Document {
  toUserId: string;
  fromUserId: string;
  achievementKey: string;
  createdAt: Date;
  seenByRecipient: boolean;
}

const CheerSchema = new Schema<ICheer>(
  {
    toUserId: { type: String, required: true, index: true },
    fromUserId: { type: String, required: true, index: true },
    achievementKey: { type: String, required: true },
    seenByRecipient: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CheerSchema.index({ toUserId: 1, fromUserId: 1, achievementKey: 1 }, { unique: true });

export const Cheer = mongoose.model<ICheer>('Cheer', CheerSchema);

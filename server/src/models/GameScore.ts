import mongoose, { Schema, Document } from 'mongoose';

export interface IGameScore extends Document {
  userId: string;
  game: 'price' | 'budget';
  score: number;
  createdAt?: Date;
}

const GameScoreSchema = new Schema<IGameScore>(
  {
    userId: { type: String, required: true, index: true },
    game:   { type: String, required: true, enum: ['price', 'budget'] },
    score:  { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export const GameScore = mongoose.model<IGameScore>('GameScore', GameScoreSchema);
